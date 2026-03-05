import type { ProfileAnalysis, TickData, ScriptStats, Grade } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const TICK_GAP_MS = 15;       // idle gap that signals a new tick
const HEAVY_TICK_MS = 25;     // ticks over this are "heavy"

// ─── Patterns that identify script-execution markers ─────────────────────────
const RESOURCE_PATTERNS: RegExp[] = [
  /^tick\s+\((.+)\)$/,
  /^event:[^\s]+\s+\((.+)\)$/,
  /^thread\s+@([^/\s]+)/,
  /^ref call\s+\[@?([^/\s]+)/,
  /^command:[^\s]+\s+\((.+)\)$/,
  /^stateHandler:[^\s]+\s+\((.+)\)$/,
  /^(?:Escrowed)\s+\((.+)\)$/,
];

function extractResource(name: string): string {
  for (const re of RESOURCE_PATTERNS) {
    const m = name.match(re);
    if (m) return m[1];
  }
  return name;
}

function isScriptEntry(name: string): boolean {
  return RESOURCE_PATTERNS.some((re) => re.test(name));
}

// ─── Raw marker ───────────────────────────────────────────────────────────────
interface Marker {
  name: string;
  startTime: number;
  endTime: number;
}

// ─── Chrome Trace Event format  { traceEvents: [...] } ───────────────────────
// ph:"X" = complete event  (ts in µs, dur in µs)
// ph:"B"/"E" = begin/end pairs
interface ChromeEvent {
  ph: string;
  name: string;
  ts: number;   // microseconds
  dur?: number; // µs, present when ph="X"
  tts?: number;
  pid?: number;
  tid?: number;
}

function parseChromTrace(events: ChromeEvent[]): Marker[] {
  const markers: Marker[] = [];

  // Complete events (ph = "X")
  const begins = new Map<string, number>(); // key = `${pid}:${tid}:${name}` → ts

  for (const ev of events) {
    if (!ev || typeof ev.name !== 'string') continue;
    if (!isScriptEntry(ev.name)) continue;

    if (ev.ph === 'X') {
      // ts and dur are in microseconds → convert to ms
      const ts  = typeof ev.ts  === 'number' ? ev.ts  / 1000 : null;
      const dur = typeof ev.dur === 'number' ? ev.dur / 1000 : null;
      if (ts === null || dur === null || dur <= 0) continue;
      markers.push({ name: ev.name, startTime: ts, endTime: ts + dur });

    } else if (ev.ph === 'B') {
      const key = `${ev.pid ?? 0}:${ev.tid ?? 0}:${ev.name}`;
      begins.set(key, ev.ts);

    } else if (ev.ph === 'E') {
      const key = `${ev.pid ?? 0}:${ev.tid ?? 0}:${ev.name}`;
      const startUs = begins.get(key);
      if (startUs !== undefined) {
        begins.delete(key);
        const startTime = startUs / 1000;
        const endTime   = ev.ts  / 1000;
        if (endTime > startTime)
          markers.push({ name: ev.name, startTime, endTime });
      }
    }
  }

  return markers;
}

// ─── Locate the threads array in any known Gecko profile structure ────────────
function findThreads(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== 'object') {
    throw new Error('El archivo no contiene JSON válido o está vacío.');
  }

  if (!Array.isArray(json)) {
    const root = json as Record<string, unknown>;

    // Gecko standard  { threads: [...] }
    if (Array.isArray(root.threads) && root.threads.length > 0)
      return root.threads as Record<string, unknown>[];

    // Wrapped  { profile: { threads: [...] } }
    for (const key of ['profile', 'data', 'result', 'profiler']) {
      const nested = root[key];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const n = nested as Record<string, unknown>;
        if (Array.isArray(n.threads) && n.threads.length > 0)
          return n.threads as Record<string, unknown>[];
      }
    }

    // Root object IS a single thread
    if (root.markers !== undefined || root.samples !== undefined)
      return [root];
  }

  // Root IS the threads array
  if (Array.isArray(json)) {
    const arr = json as Record<string, unknown>[];
    if (arr.length > 0 && (arr[0].markers !== undefined || arr[0].samples !== undefined))
      return arr;
  }

  return [];
}

// ─── Extract markers from ONE Gecko thread ────────────────────────────────────
function markersFromThread(thread: Record<string, unknown>): Marker[] {
  const result: Marker[] = [];
  const markersObj = thread.markers as Record<string, unknown> | undefined;
  if (!markersObj) return result;

  const strings: string[] = Array.isArray(thread.stringTable)
    ? (thread.stringTable as string[])
    : [];

  function resolveName(raw: unknown): string {
    if (typeof raw === 'number') return strings[raw] ?? '';
    return String(raw ?? '');
  }

  // ── Format A: parallel arrays  (Gecko profile v24+) ──────────────────────
  if (
    typeof markersObj.length === 'number' &&
    (Array.isArray(markersObj.name) || Array.isArray(markersObj.startTime))
  ) {
    const length   = markersObj.length as number;
    const names    = (markersObj.name      as unknown[]) ?? [];
    const startArr = (markersObj.startTime as unknown[]) ?? [];
    const endArr   = (markersObj.endTime   as unknown[]) ?? [];
    const phaseArr = (markersObj.phase     as unknown[]) ?? [];

    for (let i = 0; i < length; i++) {
      const phase = phaseArr[i];
      if (phase !== undefined && phase !== null && phase !== 3) continue;

      const name = resolveName(names[i]);
      if (!isScriptEntry(name)) continue;

      const startTime = startArr[i] as number;
      const endTime   = endArr[i]   as number;
      if (typeof startTime !== 'number' || typeof endTime !== 'number') continue;
      if (endTime <= startTime) continue;
      result.push({ name, startTime, endTime });
    }
    if (result.length > 0) return result;
  }

  // ── Format B: schema + data array-of-arrays ───────────────────────────────
  if (markersObj.schema && Array.isArray(markersObj.data)) {
    const schema   = markersObj.schema as Record<string, number>;
    const nameIdx  = schema['name']      ?? 0;
    const startIdx = schema['startTime'] ?? schema['time'] ?? 1;
    const endIdx   = schema['endTime']   ?? 2;
    const phaseIdx = schema['phase'];
    const dataIdx  = schema['data'];

    for (const entry of markersObj.data as unknown[]) {
      if (!Array.isArray(entry)) continue;
      if (phaseIdx !== undefined && (entry[phaseIdx] as number) !== 3) continue;

      const name = resolveName(entry[nameIdx]);
      if (!isScriptEntry(name)) continue;

      let startTime = entry[startIdx] as number;
      let endTime   = entry[endIdx]   as number;

      if ((typeof endTime !== 'number' || endTime <= startTime) && dataIdx !== undefined) {
        const extra = entry[dataIdx] as Record<string, unknown> | null;
        if (extra && typeof extra === 'object') {
          if (typeof extra.endTime === 'number')      endTime = extra.endTime as number;
          else if (typeof extra.duration === 'number') endTime = startTime + (extra.duration as number);
        }
      }

      if (typeof startTime !== 'number' || typeof endTime !== 'number') continue;
      if (endTime <= startTime) continue;
      result.push({ name, startTime, endTime });
    }
  }

  return result;
}

// ─── Main marker extractor — tries all known formats ─────────────────────────
function parseMarkers(json: unknown): Marker[] {
  if (!json || typeof json !== 'object') {
    throw new Error('El archivo no contiene JSON válido o está vacío.');
  }

  const root = json as Record<string, unknown>;

  // ── Chrome Trace Event format: { traceEvents: [...] } ────────────────────
  if (Array.isArray(root.traceEvents)) {
    const markers = parseChromTrace(root.traceEvents as ChromeEvent[]);
    if (markers.length > 0) return markers;
    // If traceEvents exists but has 0 script markers, give a targeted error
    throw new Error(
      `El archivo es un Chrome Trace (traceEvents) con ${root.traceEvents.length} eventos, ` +
      `pero ninguno coincide con eventos de scripts de FiveM. ` +
      `Verifica que grabaste con "profiler record" estando el servidor corriendo con jugadores.`
    );
  }

  // ── Chrome Trace as bare array: [ {...}, {...} ] ───────────────────────────
  if (Array.isArray(json)) {
    const arr = json as ChromeEvent[];
    if (arr.length > 0 && typeof arr[0].ph === 'string' && typeof arr[0].ts === 'number') {
      const markers = parseChromTrace(arr);
      if (markers.length > 0) return markers;
    }
  }

  // ── Gecko format ──────────────────────────────────────────────────────────
  const threads = findThreads(json);
  if (threads.length > 0) {
    const markers: Marker[] = [];
    for (const thread of threads) {
      for (const m of markersFromThread(thread)) markers.push(m);
    }
    return markers;
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  const keys = Object.keys(root).slice(0, 12).join(', ');
  throw new Error(
    `Formato no reconocido. Claves encontradas: [${keys || '(ninguna)'}]. ` +
    `Sube el archivo generado por "profiler saveJSON" o "profiler save" en txAdmin.`
  );
}

// ─── Group sorted markers into ticks by finding >15ms idle gaps ──────────────
function groupTicks(markers: Marker[]): Marker[][] {
  if (markers.length === 0) return [];

  markers.sort((a, b) => a.startTime - b.startTime);

  const ticks: Marker[][] = [[markers[0]]];
  let tickMaxEnd = markers[0].endTime;

  for (let i = 1; i < markers.length; i++) {
    const m = markers[i];
    if (m.startTime - tickMaxEnd > TICK_GAP_MS) {
      ticks.push([m]);
      tickMaxEnd = m.endTime;
    } else {
      ticks[ticks.length - 1].push(m);
      tickMaxEnd = Math.max(tickMaxEnd, m.endTime);
    }
  }

  return ticks;
}

// ─── Grade logic (from worst to best) ────────────────────────────────────────
function calcGrade(avgMs: number, heavyPct: number): Grade {
  if (avgMs >= 30 || heavyPct >= 30) return 'Critical';
  if (avgMs >= 20 || heavyPct >= 15) return 'Poor';
  if (avgMs >= 10 || heavyPct >= 5) return 'Fair';
  if (avgMs >= 5 || heavyPct >= 1) return 'Good';
  return 'Excellent';
}

// ─── Main export ─────────────────────────────────────────────────────────────
export function parseProfilerFile(json: unknown, fileName: string): ProfileAnalysis {
  const rawMarkers = parseMarkers(json);

  if (rawMarkers.length === 0) {
    throw new Error(
      `No se encontraron eventos de scripts de FiveM en el archivo. ` +
      `Verifica que grabaste el profiler con "profiler record" mientras había jugadores ` +
      `y que subiste el archivo correcto.`
    );
  }

  const tickGroups = groupTicks(rawMarkers);

  // ── Build per-tick data ──
  const ticks: TickData[] = tickGroups.map((group, idx) => {
    const scriptMap = new Map<string, number>();
    for (const m of group) {
      scriptMap.set(m.name, (scriptMap.get(m.name) ?? 0) + (m.endTime - m.startTime));
    }
    const totalTime = Array.from(scriptMap.values()).reduce((a, b) => a + b, 0);
    return {
      index: idx,
      totalTime,
      isHeavy: totalTime > HEAVY_TICK_MS,
      startTime: group[0].startTime,
      scripts: Array.from(scriptMap.entries())
        .map(([name, time]) => ({ name, time }))
        .sort((a, b) => b.time - a.time),
    };
  });

  // ── Aggregate per-script stats across all ticks ──
  const scriptMap = new Map<
    string,
    {
      name: string;
      resource: string;
      totalTime: number;
      maxTime: number;
      tickCount: number;
      heavyTickCount: number;
    }
  >();

  for (const tick of ticks) {
    for (const entry of tick.scripts) {
      const existing = scriptMap.get(entry.name);
      if (!existing) {
        scriptMap.set(entry.name, {
          name: entry.name,
          resource: extractResource(entry.name),
          totalTime: entry.time,
          maxTime: entry.time,
          tickCount: 1,
          heavyTickCount: tick.isHeavy ? 1 : 0,
        });
      } else {
        existing.totalTime += entry.time;
        existing.maxTime = Math.max(existing.maxTime, entry.time);
        existing.tickCount++;
        if (tick.isHeavy) existing.heavyTickCount++;
      }
    }
  }

  const scripts: ScriptStats[] = Array.from(scriptMap.values()).map((s) => ({
    ...s,
    avgTimePerTick: s.totalTime / ticks.length,
  }));

  const heavyCount = ticks.filter((t) => t.isHeavy).length;
  const avgScriptTime =
    ticks.reduce((s, t) => s + t.totalTime, 0) / ticks.length;
  const maxScriptTime = Math.max(...ticks.map((t) => t.totalTime));
  const heavyPct = (heavyCount / ticks.length) * 100;

  return {
    fileName,
    uploadedAt: new Date(),
    tickCount: ticks.length,
    heavyTickCount: heavyCount,
    avgScriptTime,
    maxScriptTime,
    grade: calcGrade(avgScriptTime, heavyPct),
    ticks,
    scripts,
    topCpuHogs: [...scripts].sort((a, b) => b.totalTime - a.totalTime).slice(0, 20),
    topSpikes: [...scripts].sort((a, b) => b.maxTime - a.maxTime).slice(0, 20),
    topHitchDrivers: [...scripts]
      .sort((a, b) => b.heavyTickCount - a.heavyTickCount)
      .slice(0, 20),
  };
}
