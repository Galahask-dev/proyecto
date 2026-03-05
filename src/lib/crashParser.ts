import JSZip from 'jszip';
import type { CrashAnalysis } from '../types';

// ─── Tipos de excepción conocidos ────────────────────────────────────────────
const EXCEPTION_NAMES: Record<string, string> = {
  'C0000005': 'Violación de acceso (Access Violation)',
  '80000003': 'Breakpoint',
  'C000001D': 'Instrucción ilegal',
  'C0000374': 'Corrupción de heap',
  'C0000409': 'Desbordamiento de buffer en stack',
  'C0000094': 'División por cero (entero)',
  'C0000095': 'Desbordamiento de entero',
  'C00000FD': 'Desbordamiento de stack',
  '40000015': 'Interrupción del proceso',
  'C0000135': 'DLL no encontrada',
  'C0000142': 'Error al inicializar DLL',
};

function resolveExceptionName(code: string): string {
  const normalized = code.replace(/^0x/i, '').toUpperCase();
  return EXCEPTION_NAMES[normalized] ?? 'Excepción desconocida';
}

function firstMatch(content: string, patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = content.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

// Elimina los códigos de color CFX de las líneas de log (^0-^9, ^*, ^!)
function stripCfxColors(s: string): string {
  return s.replace(/\^[0-9*!]/g, '');
}

// Genera un motivo legible en español
function buildCrashReason(
  exceptionCode: string,
  crashModule: string,
  crashModuleOffset: string,
  violationType: string,
): string {
  const code = exceptionCode.replace(/^0x/i, '').toUpperCase();
  const mod  = crashModule.toLowerCase();
  const full = crashModuleOffset ? `${crashModule}+${crashModuleOffset}` : crashModule;
  const accion = violationType === 'escritura' ? 'escribir en' : 'leer';

  if (code === 'C0000005') {
    if (mod.includes('fivem') || mod.includes('citizenfx') || mod.includes('gtaprocess')) {
      return `Violación de acceso al intentar ${accion} memoria en ${full}. Esto ocurre dentro del proceso de FiveM. Puede ser un bug del juego, un problema de streaming, o causado por un script que interactúa con un estado de juego inválido.`;
    }
    if (mod.endsWith('.dll')) {
      return `Violación de acceso al intentar ${accion} memoria en ${full}. El crash ocurrió en una librería del sistema o de terceros. Puede indicar drivers desactualizados o conflicto de software externo.`;
    }
    return `Violación de acceso al intentar ${accion} memoria en ${full}. Posible mod conflictivo o corrupción de archivos del juego.`;
  }
  if (code === 'C0000374') {
    return `Corrupción de heap detectada en ${full}. Algún proceso sobreescribió memoria más allá de los límites asignados. Generalmente causado por mods o DLLs externas.`;
  }
  if (code === 'C00000FD') {
    return `Desbordamiento de stack en ${full}. Se agotó la memoria del stack del hilo, generalmente por recursión infinita en un script o mod.`;
  }
  if (code === 'C0000135') {
    return `No se encontró una DLL requerida. Instala o reinstala Visual C++ Redistributables y DirectX.`;
  }
  if (full) {
    return `El crash ocurrió en ${full} con código de excepción ${exceptionCode}.`;
  }
  return 'No se pudo determinar la causa del crash. Revisa los logs para más información.';
}

// Calcula la confianza del análisis
function computeConfidence(crashModule: string, exceptionCode: string, crashHash: string): string {
  let score = 0;
  if (crashModule && crashModule !== 'No detectado') score++;
  if (exceptionCode && exceptionCode !== 'No detectado') score++;
  if (crashHash) score++;
  if (score >= 3) return 'Alta';
  if (score >= 2) return 'Media';
  return 'Baja';
}

// ─── Leer todos los archivos del ZIP en paralelo ──────────────────────────────
async function readAllFiles(zip: JSZip): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  await Promise.all(
    names.map(async (name) => {
      try {
        const raw = await zip.files[name].async('string');
        if (raw.length <= 5_000_000) result.set(name, raw);
      } catch { /* skip binary files */ }
    })
  );
  return result;
}

// ─── Intentar parsear un JSON con validación segura ───────────────────────────
function tryParseJSON(raw: string): Record<string, unknown> | null {
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === 'object' && !Array.isArray(p)) return p as Record<string, unknown>;
  } catch { /* ignored */ }
  return null;
}

export async function parseCrashZip(file: File): Promise<CrashAnalysis> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('No se puede leer el ZIP. Verifica que el archivo no esté corrupto.');
  }

  const fileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const files = await readAllFiles(zip);

  let crashModule       = '';
  let crashModuleOffset = '';
  let exceptionCode     = '';
  let exceptionAddress  = '';
  let buildNumber       = '';
  let gameVersion       = '';
  let clientVersion     = '';
  let osVersion         = '';
  let stackTrace        = '';
  let violationType     = '';
  let architecture      = '';
  let crashHash         = '';
  let recentLogErrors: string[] = [];
  let lastLogLines: string[]    = [];
  let primaryJson: Record<string, unknown> | null = null;

  // ── 1. Leer todos los JSON ─────────────────────────────────────────────────
  for (const [name, raw] of files) {
    if (!name.endsWith('.json')) continue;
    const data = tryParseJSON(raw);
    if (!data) continue;

    // El JSON principal del crash tiene estas claves características
    const isCrashReport =
      data['ModuleName'] !== undefined ||
      data['CrashModule'] !== undefined ||
      data['ExceptionCode'] !== undefined ||
      data['exception'] !== undefined ||
      data['crash'] !== undefined ||
      name.toLowerCase().includes('crash') ||
      name.toLowerCase().includes('report');

    if (isCrashReport && !primaryJson) primaryJson = data;

    // ── Claves del formato de txAdmin / CFX crash reporter ────────────────
    const d = data;

    // Módulo
    const mod =
      d['ModuleName'] ?? d['CrashModule'] ?? d['crashModule'] ??
      d['module'] ?? d['faultModule'] ?? (d['crash'] as Record<string,unknown>)?.['module'];
    if (mod && typeof mod === 'string' && !crashModule) crashModule = mod;

    // Offset dentro del módulo
    const off = d['ModuleOffset'] ?? d['moduleOffset'] ?? d['offset'] ??
      (d['crash'] as Record<string,unknown>)?.['offset'];
    if (off !== undefined && !crashModuleOffset) crashModuleOffset = `0x${Number(off).toString(16).toUpperCase()}`;

    // Código de excepción
    const exc =
      d['ExceptionCode'] ?? d['exceptionCode'] ?? d['exception_code'] ??
      (d['exception'] as Record<string,unknown>)?.['code'];
    if (exc !== undefined && !exceptionCode) {
      exceptionCode = typeof exc === 'number'
        ? `0x${(exc >>> 0).toString(16).toUpperCase()}`
        : String(exc);
    }

    // Dirección de excepción
    const addr =
      d['ExceptionAddress'] ?? d['exceptionAddress'] ??
      (d['exception'] as Record<string,unknown>)?.['address'];
    if (addr !== undefined && !exceptionAddress) {
      exceptionAddress = typeof addr === 'number'
        ? `0x${addr.toString(16).toUpperCase()}`
        : String(addr);
    }

    // Build / versión
    const bld = d['BuildNumber'] ?? d['build'] ?? d['buildNumber'] ??
      d['gameBuild'] ?? d['GameBuild'];
    if (bld !== undefined && !buildNumber) buildNumber = String(bld);

    const ver = d['GameVersion'] ?? d['gameVersion'] ?? d['version'] ??
      d['clientVersion'] ?? d['fivemVersion'];
    if (ver !== undefined && !clientVersion) clientVersion = String(ver);

    const gver = d['GameVersion'] ?? d['gameVersion'] ?? d['gtaVersion'];
    if (gver !== undefined && !gameVersion) gameVersion = String(gver);

    const os = d['OS'] ?? d['os'] ?? d['OsVersion'] ?? d['osVersion'] ??
      d['operatingSystem'];
    if (os !== undefined && !osVersion) osVersion = String(os);

    // ── Campos específicos de crashometry.json ────────────────────────────
    if (name.toLowerCase() === 'crashometry.json' || name.toLowerCase().includes('crashometry')) {
      const h = d['crash_id'] ?? d['crashId'] ?? d['crash_hash'] ?? d['crashHash'] ??
                d['hash'] ?? d['id'] ?? d['signature'];
      if (h && typeof h === 'string' && !crashHash) crashHash = h;

      const v = d['violation'] ?? d['access_type'] ?? d['accessType'] ??
                (d['exception'] as Record<string,unknown>)?.['access'] ??
                (d['exception'] as Record<string,unknown>)?.['violation'];
      if (v && typeof v === 'string' && !violationType) {
        violationType = v.toLowerCase().includes('write') ? 'escritura' : 'lectura';
      }
    }

    // Arquitectura
    const arch = d['architecture'] ?? d['arch'] ?? d['cpu_arch'] ?? d['cpu'];
    if (arch && typeof arch === 'string' && !architecture) architecture = arch;
  }

  // ── 2. Leer archivos de texto ──────────────────────────────────────────────
  for (const [name, raw] of files) {
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (!['txt', 'log', 'dmp', ''].includes(ext)) continue;
    if (raw.length < 10) continue;

    if (!exceptionCode) {
      exceptionCode = firstMatch(raw, [
        /Exception\s+[Cc]ode\s*[:\s=]+([0-9A-Fa-fx]+)/,
        /EXCEPTION_CODE\s*[=:]\s*([0-9A-Fa-fx]+)/i,
        /Exception:\s*([0-9A-Fa-fx]{8,})/i,
      ]);
    }
    if (!crashModule) {
      crashModule = firstMatch(raw, [
        /(?:Fault|Faulting)\s+[Mm]odule(?:\s+[Nn]ame)?\s*[:\s]+([^\r\n,+]+)/i,
        /[Cc]rash(?:ed)?\s+(?:in|at)\s+([^\r\n(]+\.(?:exe|dll))/i,
        /Module\s*:\s*([^\r\n]+\.(?:exe|dll))/i,
      ]);
    }
    if (!exceptionAddress) {
      exceptionAddress = firstMatch(raw, [
        /(?:Exception|Fault)\s+[Aa]ddress\s*[:\s]+([0-9A-Fa-fx]+)/,
        /[Aa]ddress\s*[:\s]+([0-9A-Fa-fx]{6,})/,
      ]);
    }
    if (!crashModuleOffset) {
      crashModuleOffset = firstMatch(raw, [
        /(?:Fault|Module)\s+[Oo]ffset\s*[:\s]+([0-9A-Fa-fx]+)/,
      ]);
    }
    if (!buildNumber) {
      buildNumber = firstMatch(raw, [
        /(?:Build|build)\s*[:\s]+(\d{4,})/,
        /\bb(\d{4,})\b/,
      ]);
    }
    if (!osVersion) {
      osVersion = firstMatch(raw, [
        /OS\s*[:\s]+([^\r\n]{4,60})/i,
        /Windows\s+[\w\s.]+\d[\w\s.]*/i,
      ]);
    }

    // Stack trace — busca el primer archivo con contenido tipo stack
    if (!stackTrace && (
      name.toLowerCase().includes('stack') ||
      name.toLowerCase().includes('trace') ||
      name.toLowerCase().includes('crash') ||
      raw.includes('at 0x') ||
      raw.match(/\w+\.dll\s*\+\s*0x/)
    )) {
      stackTrace = raw.slice(0, 6000);
    }

    // Tipo de acceso a memoria desde texto de log
    if (!violationType) {
      if (/write access violation|access writing|escritura/i.test(raw)) violationType = 'escritura';
      else if (/read access violation|access reading|lectura/i.test(raw))  violationType = 'lectura';
    }
  }

  // ── 3. Parsear CitizenFX_log para errores recientes y últimas líneas ────────
  for (const [name, raw] of files) {
    if (!name.toLowerCase().includes('citizenfx')) continue;
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (!['log', 'txt'].includes(ext)) continue;

    const lines = raw.split('\n')
      .map(stripCfxColors)
      .map(l => l.trimEnd())
      .filter(l => l.trim().length > 0);

    recentLogErrors = lines
      .filter(l =>
        l.includes('SCRIPT ERROR') ||
        l.includes('SCRIPT WARN') ||
        (l.includes('[WARN]') && (l.includes('error') || l.includes('Error') || l.includes('import'))) ||
        l.includes('Error:') ||
        l.includes('error at') ||
        l.includes('caused FiveM to stop')
      )
      .slice(-25);

    lastLogLines = lines.slice(-80);
    break;
  }

  // ── Fallbacks ──────────────────────────────────────────────────────────────
  if (!crashModule)       crashModule       = 'No detectado';
  if (!exceptionCode)     exceptionCode     = 'No detectado';
  if (!buildNumber)       buildNumber       = 'No detectado';
  if (!clientVersion)     clientVersion     = 'No detectado';
  if (!exceptionAddress)  exceptionAddress  = '';
  if (!crashModuleOffset) crashModuleOffset = '';
  if (!osVersion)         osVersion         = '';
  if (!violationType)     violationType     = '';
  // Intentar extraer arquitectura del string de OS
  if (!architecture) {
    if (/x64|64.bit/i.test(osVersion)) architecture = 'x64';
    else if (/x86|32.bit/i.test(osVersion)) architecture = 'x86';
    else architecture = 'x64'; // FiveM moderno es siempre x64
  }

  const exceptionName = resolveExceptionName(exceptionCode);
  const crashReason   = buildCrashReason(exceptionCode, crashModule, crashModuleOffset, violationType);
  const confidence    = computeConfidence(crashModule, exceptionCode, crashHash);

  return {
    fileName: file.name,
    uploadedAt: new Date(),
    crashModule,
    crashModuleOffset,
    exceptionCode,
    exceptionName,
    exceptionAddress,
    violationType,
    buildNumber,
    gameVersion,
    clientVersion,
    osVersion,
    architecture,
    crashHash,
    crashReason,
    confidence,
    recentLogErrors,
    lastLogLines,
    stackTrace,
    fileNames,
    rawJson: primaryJson,
  };
}
