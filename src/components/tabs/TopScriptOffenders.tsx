import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { ScriptOffender } from '../../types';

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max((value / max) * 100, 1);
  return (
    <div className="h-1.5 w-24 rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TopScriptOffenders() {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'serversCount' | 'avgCpuPerFrame' | 'worstTick'>('serversCount');

  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  const offenders = useMemo<ScriptOffender[]>(() => {
    if (!profiles || profiles.length === 0) return [];

    const map = new Map<
      string,
      { name: string; resource: string; servers: Set<number>; cpuTotal: number; worstTick: number; count: number }
    >();

    for (const profile of profiles) {
      const pid = profile.id ?? Math.random();
      for (const script of profile.scripts) {
        const existing = map.get(script.name);
        if (!existing) {
          map.set(script.name, {
            name: script.name,
            resource: script.resource,
            servers: new Set([pid as number]),
            cpuTotal: script.avgTimePerTick,
            worstTick: script.maxTime,
            count: 1,
          });
        } else {
          existing.servers.add(pid as number);
          existing.cpuTotal += script.avgTimePerTick;
          existing.worstTick = Math.max(existing.worstTick, script.maxTime);
          existing.count++;
        }
      }
    }

    return Array.from(map.values()).map((e) => ({
      name: e.name,
      resource: e.resource,
      serversCount: e.servers.size,
      avgCpuPerFrame: e.cpuTotal / e.count,
      worstTick: e.worstTick,
    }));
  }, [profiles]);

  const filtered = offenders.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.resource.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => b[sortCol] - a[sortCol]).slice(0, 50);

  const maxServers = Math.max(...sorted.map((o) => o.serversCount), 1);
  const maxCpu = Math.max(...sorted.map((o) => o.avgCpuPerFrame), 1);
  const maxTick = Math.max(...sorted.map((o) => o.worstTick), 1);

  function headerBtn(col: typeof sortCol, label: string) {
    return (
      <th
        className={`cursor-pointer px-4 py-3 text-right text-xs font-medium uppercase tracking-wide hover:text-white transition-colors ${sortCol === col ? 'text-accent' : 'text-zinc-500'}`}
        onClick={() => setSortCol(col)}
      >
        {label}
      </th>
    );
  }

  if (!profiles) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500">Cargando…</div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Top Script Offenders</h1>
          <p className="text-zinc-400 mt-1">
            Los 50 scripts más comunes en todos los profiles compartidos, ordenados por cuántos servidores los han tenido.
          </p>
        </div>
        <div className="card p-12 text-center text-zinc-500">
          <p className="text-lg font-medium text-zinc-400 mb-2">Sin datos todavía</p>
          <p className="text-sm">Analiza y guarda profiles en la pestaña <strong className="text-white">Profiler Analyzer</strong> para ver offenders agregados aquí.</p>
        </div>
      </div>
    );
  }

  const uniqueScripts = new Set(offenders.map((o) => o.name)).size;
  const topScript = sorted[0]?.name ?? '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Top Offenders</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Top 50 scripts más comunes en todos los profiles guardados, ordenados por cuántos profiles los tienen.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-4 text-center">
          <p className="text-3xl font-bold text-white">{profiles.length}</p>
          <p className="text-xs text-zinc-500 mt-1">profiles analizados</p>
        </div>
        <div className="card px-4 py-4 text-center">
          <p className="text-3xl font-bold text-white">{uniqueScripts.toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-1">scripts únicos registrados</p>
        </div>
        <div className="card px-4 py-4 text-center">
          <p className="text-lg font-bold text-accent truncate px-2">{topScript}</p>
          <p className="text-xs text-zinc-500 mt-1">#1 script más flaggeado</p>
        </div>
      </div>

      {/* Search + table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por script o recurso…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
          />
          <span className="text-xs text-zinc-500 shrink-0">
            {sorted.length} de {filtered.length} mostrados (top 50)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Script / Event</th>
                {headerBtn('serversCount', 'Profiles flaggeados')}
                {headerBtn('avgCpuPerFrame', 'Avg CPU/frame')}
                {headerBtn('worstTick', 'Worst tick')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={o.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 text-zinc-600 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-mono text-xs text-white truncate" title={o.name}>{o.name}</div>
                    {o.resource !== o.name && (
                      <div className="text-xs text-zinc-500">{o.resource}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <ProgressBar
                        value={o.serversCount}
                        max={maxServers}
                        color={i < 3 ? 'bg-red-500' : i < 6 ? 'bg-orange-500' : i < 10 ? 'bg-amber-500' : 'bg-yellow-600'}
                      />
                      <span className={`font-mono text-xs font-semibold w-6 text-right ${i < 3 ? 'text-red-400' : 'text-zinc-300'}`}>
                        {o.serversCount}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-zinc-300">
                    <div className="flex items-center justify-end gap-3">
                      <ProgressBar value={o.avgCpuPerFrame} max={maxCpu} color="bg-zinc-500" />
                      {o.avgCpuPerFrame.toFixed(2)}ms
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono text-xs ${o.worstTick > 25 ? 'text-red-400' : 'text-zinc-300'}`}>
                    <div className="flex items-center justify-end gap-3">
                      <ProgressBar value={o.worstTick} max={maxTick} color="bg-zinc-500" />
                      {o.worstTick.toFixed(2)}ms
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
