import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Loader2, Save, Trash2, AlertCircle, FileArchive,
  ChevronDown, ChevronUp, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { db } from '../../db/database';
import { parseCrashZip } from '../../lib/crashParser';
import FileDropzone from '../FileDropzone';
import type { CrashAnalysis, StoredCrash } from '../../types';

// ─── Fila de dato en columna de datos técnicos ────────────────────────────────
function DataRow({ label, value, bold = false, highlight = false }: {
  label: string; value: string; bold?: boolean; highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-mono break-all ${bold ? 'font-bold' : ''} ${
        highlight ? 'text-blue-300' : 'text-white'
      }`}>
        {value}
      </span>
    </div>
  );
}

// ─── Panel de resultado completo ──────────────────────────────────────────────
function CrashResult({ crash, onSave, onReset, saving, alreadySaved }: {
  crash: CrashAnalysis;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  alreadySaved: boolean;
}) {
  const [showLastLog, setShowLastLog] = useState(false);
  const [showRaw,     setShowRaw]     = useState(false);

  const moduleDisplay = crash.crashModuleOffset
    ? `${crash.crashModule}+${crash.crashModuleOffset}`
    : crash.crashModule;

  const cfxSearchUrl = crash.crashHash
    ? `https://forum.cfx.re/search?q=${encodeURIComponent(crash.crashHash)}`
    : `https://forum.cfx.re/search?q=${encodeURIComponent(crash.crashModule)}`;

  return (
    <div className="space-y-4">

      {/* ── Barra de nombre de archivo ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{crash.fileName}</p>
          <p className="text-xs text-zinc-500">{crash.fileNames.length} archivos encontrados en el ZIP</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Analizar otro
          </button>
          {!alreadySaved ? (
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Guardar
            </button>
          ) : (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Save className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
        </div>
      </div>

      {/* ── Card principal ── */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">

        {/* Encabezado del card */}
        <div className="px-6 pt-5 pb-4 space-y-3">
          {/* Badge + confianza */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wide">
              FiveM Crash
            </span>
            <span className="text-sm text-zinc-500">Confianza {crash.confidence}</span>
          </div>

          {/* Título */}
          <h2 className="text-2xl font-bold text-white">
            Crash en {crash.crashModule}
          </h2>

          {/* Hash + buscar */}
          {crash.crashHash && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-mono px-3 py-1 rounded-lg bg-teal-900/40 text-teal-300 border border-teal-700/40">
                {crash.crashHash}
              </span>
              <a
                href={cfxSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Buscar en foros CFX <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          {!crash.crashHash && (
            <a
              href={cfxSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Buscar en foros CFX <ExternalLink className="h-3 w-3" />
            </a>
          )}

          {/* Motivo del crash */}
          <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Motivo del crash</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{crash.crashReason}</p>
          </div>
        </div>

        {/* Tres columnas: Excepción | Sistema | Archivos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-zinc-800">

          {/* Excepción */}
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Excepción</p>
            <DataRow label="Tipo"      value={crash.exceptionName.split(' (')[0]} bold />
            <DataRow label="Código"    value={crash.exceptionCode} />
            <DataRow label="Módulo"    value={moduleDisplay} bold highlight />
            {crash.violationType && (
              <DataRow label="Acceso" value={crash.violationType} />
            )}
            {crash.exceptionAddress && (
              <DataRow label="En dirección" value={crash.exceptionAddress} />
            )}
            {!crash.crashModuleOffset && (
              <p className="text-xs text-zinc-600 italic mt-2">Sin símbolos para este build</p>
            )}
          </div>

          {/* Sistema */}
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Sistema</p>
            {crash.osVersion ? (
              <DataRow label="OS" value={crash.osVersion} bold />
            ) : null}
            <DataRow label="Arquitectura" value={crash.architecture} />
            {crash.buildNumber && crash.buildNumber !== 'No detectado' && (
              <DataRow label="Build del juego" value={crash.buildNumber} />
            )}
            {crash.clientVersion && crash.clientVersion !== 'No detectado' && (
              <DataRow label="Versión cliente" value={crash.clientVersion} />
            )}
          </div>

          {/* Archivos en ZIP */}
          <div className="px-5 py-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Archivos en el ZIP</p>
            <div className="mt-2 space-y-1.5">
              {crash.fileNames.map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <FileArchive className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  <span className="text-xs font-mono text-zinc-300 truncate">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Errores recientes del log ── */}
      {crash.recentLogErrors.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800">
            <p className="text-sm font-semibold text-white">Errores recientes del log</p>
          </div>
          <div className="overflow-x-auto">
            {crash.recentLogErrors.map((line, i) => (
              <div key={i} className={`px-5 py-2 text-xs font-mono border-b border-zinc-800/50 last:border-0 ${
                line.includes('SCRIPT ERROR') || line.includes('Error:') ? 'text-red-300/80' : 'text-zinc-400'
              }`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Últimas líneas del log (colapsable) ── */}
      {crash.lastLogLines.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowLastLog(v => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800/30 transition-colors"
          >
            <span>Últimas {crash.lastLogLines.length} líneas del log</span>
            {showLastLog ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
          {showLastLog && (
            <pre className="overflow-x-auto border-t border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-400 max-h-96">
              {crash.lastLogLines.join('\n')}
            </pre>
          )}
        </div>
      )}

      {/* ── Stack trace (colapsable) ── */}
      {crash.stackTrace && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowLastLog(v => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800/30 transition-colors"
          >
            <span>Stack trace</span>
            {showLastLog ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
          {showLastLog && (
            <pre className="overflow-x-auto border-t border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 max-h-80">
              {crash.stackTrace}
            </pre>
          )}
        </div>
      )}

      {/* ── JSON raw (colapsable) ── */}
      {crash.rawJson && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowRaw(v => !v)}
            className="flex w-full items-center justify-between px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800/30 transition-colors"
          >
            <span>Datos JSON del reporte</span>
            {showRaw ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
          </button>
          {showRaw && (
            <pre className="overflow-x-auto border-t border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-300 max-h-96">
              {JSON.stringify(crash.rawJson, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────
export default function CrashAnalyzer() {
  const [crash,   setCrash]   = useState<CrashAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  const savedCrashes = useLiveQuery(() => db.crashes.orderBy('uploadedAt').reverse().toArray(), []);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setCrash(null);
    setSavedId(null);
    try {
      const result = await parseCrashZip(file);
      setCrash(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el archivo ZIP.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!crash) return;
    setSaving(true);
    try {
      const id = await db.crashes.add({ ...crash });
      setSavedId(id as number);
    } catch {
      setError('Error al guardar en la base de datos.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await db.crashes.delete(id);
    if (savedId === id) setSavedId(null);
  }

  function handleReset() {
    setCrash(null);
    setError(null);
    setSavedId(null);
  }

  return (
    <div className="space-y-8">

      {/* ── Estado inicial ── */}
      {!crash && !loading && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-white">Analizador de Crashes</h1>
            <p className="mt-1 text-sm text-blue-400">
              Sube un ZIP de crash de FiveM para identificar la causa del problema.
            </p>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-5">
            <p className="font-semibold text-white mb-3">Cómo obtener el ZIP del crash</p>
            <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
              <li>Cuando FiveM crashea, aparece un diálogo de error</li>
              <li>Haz clic en <strong className="text-white">Guardar información del crash</strong></li>
              <li>Guarda el ZIP y súbelo aquí</li>
            </ol>
            <p className="mt-3 text-xs text-zinc-500">
              También se encuentra en:{' '}
              <code className="text-xs px-2 py-0.5 rounded font-mono border bg-blue-900/40 text-blue-300 border-blue-700/40">
                %localappdata%\FiveM\FiveM.app\crashes
              </code>
            </p>
          </div>
        </>
      )}

      {/* ── Dropzone (solo en estado inicial) ── */}
      {!crash && !loading && (
        <FileDropzone
          onFile={handleFile}
          accept=".zip,application/zip"
          label="Arrastra tu crash ZIP aquí"
          hint="o haz clic para explorar · solo archivos .zip"
        />
      )}

      {/* ── Cargando ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="text-zinc-400">Analizando crash ZIP…</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-400">Error al procesar el archivo</p>
            <p className="text-sm text-red-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Resultado ── */}
      {crash && !loading && (
        <CrashResult
          crash={crash}
          onSave={handleSave}
          onReset={handleReset}
          saving={saving}
          alreadySaved={savedId !== null}
        />
      )}

      {/* ── Historial guardado ── */}
      {savedCrashes && savedCrashes.length > 0 && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Crashes guardados</h3>
            <span className="text-xs text-zinc-500">{savedCrashes.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40">
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Archivo</th>
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Módulo</th>
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Excepción</th>
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Build</th>
                  <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Fecha</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {savedCrashes.map((c: StoredCrash) => (
                  <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-mono text-xs text-white">
                        <FileArchive className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        {c.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-300">{c.crashModule}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-xs px-2 py-0.5 rounded border font-mono bg-blue-900/40 text-blue-300 border-blue-700/40">
                        {c.exceptionName}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">{c.buildNumber}</td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {new Date(c.uploadedAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id!)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Diagnósticos por tipo de excepción ──────────────────────────────────────