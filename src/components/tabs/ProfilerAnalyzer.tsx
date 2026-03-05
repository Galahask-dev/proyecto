import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Loader2, Save, Trash2, ChevronDown, ChevronUp, AlertCircle, Github } from 'lucide-react';
import { db } from '../../db/database';
import { parseProfilerFile } from '../../lib/profilerParser';
import {
  isGitHubConfigured,
  loadProfilesFromGitHub,
  pushProfiles,
} from '../../lib/githubStorage';
import FileDropzone from '../FileDropzone';
import GradeBadge from '../GradeBadge';
import TickTimeline from '../TickTimeline';
import ScriptsTable from '../ScriptsTable';
import type { ProfileAnalysis, StoredProfile } from '../../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ms(v: number) { return `${v.toFixed(2)}ms`; }
function pct(v: number, total: number) { return `${((v / total) * 100).toFixed(1)}%`; }

function gradeColor(g: ProfileAnalysis['grade']) {
  return {
    Excellent: 'text-emerald-400',
    Good: 'text-green-400',
    Fair: 'text-yellow-400',
    Poor: 'text-orange-400',
    Critical: 'text-red-400',
  }[g];
}

// ─── Top-20 card ─────────────────────────────────────────────────────────────
function TopCard({
  title,
  subtitle,
  items,
  valueLabel,
  getValue,
  highlight,
}: {
  title: string;
  subtitle: string;
  items: { name: string; resource: string; value: number }[];
  valueLabel: string;
  getValue: (v: number) => string;
  highlight?: boolean[];
}) {
  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800">
        <p className="font-semibold text-sm text-white">{title}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-zinc-900/90">
            <tr className="border-b border-zinc-800">
              <th className="px-3 py-2 text-left text-zinc-500">#</th>
              <th className="px-3 py-2 text-left text-zinc-500">Script</th>
              <th className="px-3 py-2 text-right text-zinc-500">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                <td className="px-3 py-2 text-zinc-600">{i + 1}</td>
                <td className="px-3 py-2 max-w-[160px]">
                  <div className="font-mono truncate text-white" title={item.name}>{item.name}</div>
                </td>
                <td className={`px-3 py-2 text-right font-mono ${highlight?.[i] ? 'text-red-400' : 'text-zinc-300'}`}>
                  {getValue(item.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Analysis result panel ────────────────────────────────────────────────────
function AnalysisResult({
  analysis,
  onSave,
  saving,
  alreadySaved,
}: {
  analysis: ProfileAnalysis;
  onSave: () => void;
  saving: boolean;
  alreadySaved: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  const heavyPct = (analysis.heavyTickCount / analysis.tickCount) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{analysis.fileName}</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {analysis.tickCount} ticks &middot; {analysis.scripts.length} scripts unique
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-zinc-500">Grade</p>
            <GradeBadge grade={analysis.grade} size="lg" />
          </div>
          {!alreadySaved && (
            <button
              onClick={onSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          )}
          {alreadySaved && (
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Save className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Avg script time" value={ms(analysis.avgScriptTime)} sub="per tick" />
        <StatCard label="Worst tick" value={ms(analysis.maxScriptTime)} />
        <StatCard
          label="Heavy ticks"
          value={`${analysis.heavyTickCount}`}
          sub={`${heavyPct.toFixed(1)}% of total`}
        />
        <StatCard
          label="Grade"
          value={analysis.grade}
          sub={pct(analysis.heavyTickCount, analysis.tickCount) + ' heavy'}
        />
      </div>

      {/* Timeline */}
      <div className="card p-4">
        <h3 className="mb-3 font-semibold text-white">Tick Timeline</h3>
        <TickTimeline ticks={analysis.ticks} />
      </div>

      {/* Top 20 */}
      <div>
        <h3 className="mb-3 font-semibold text-white">Top 20 Worst Scripts</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <TopCard
            title="CPU HOG"
            subtitle="Most total CPU time across the whole recording."
            items={analysis.topCpuHogs.map((s) => ({ name: s.name, resource: s.resource, value: s.totalTime }))}
            valueLabel="Total CPU"
            getValue={(v) => `${v.toFixed(1)}ms`}
            highlight={analysis.topCpuHogs.map((s) => s.totalTime > 500)}
          />
          <TopCard
            title="SPIKE"
            subtitle="Worst single tick. One-off spikes players actually feel."
            items={analysis.topSpikes.map((s) => ({ name: s.name, resource: s.resource, value: s.maxTime }))}
            valueLabel="Worst tick"
            getValue={(v) => `${v.toFixed(2)}ms`}
            highlight={analysis.topSpikes.map((s) => s.maxTime > 25)}
          />
          <TopCard
            title="HITCH DRIVER"
            subtitle="Appeared most often during heavy ticks."
            items={analysis.topHitchDrivers.map((s) => ({ name: s.name, resource: s.resource, value: s.heavyTickCount }))}
            valueLabel="Heavy appearances"
            getValue={(v) => `${v}x`}
            highlight={analysis.topHitchDrivers.map((s) => s.heavyTickCount > 5)}
          />
        </div>
      </div>

      {/* Full table toggle */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowTable((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800/30 transition-colors"
        >
          <span>Todos los scripts ({analysis.scripts.length})</span>
          {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showTable && (
          <div className="border-t border-zinc-800 p-4">
            <ScriptsTable scripts={analysis.scripts} tickCount={analysis.tickCount} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Saved profiles list ──────────────────────────────────────────────────────
function SavedProfileRow({
  profile,
  onSelect,
  onDelete,
}: {
  profile: StoredProfile;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
      <td className="px-4 py-3">
        <button onClick={onSelect} className="text-left font-mono text-sm text-white hover:text-accent transition-colors">
          {profile.fileName}
        </button>
      </td>
      <td className="px-4 py-3">
        <GradeBadge grade={profile.grade} size="sm" />
      </td>
      <td className="px-4 py-3 text-right text-xs font-mono text-zinc-400">
        {profile.avgScriptTime.toFixed(2)}ms
      </td>
      <td className="px-4 py-3 text-right text-xs text-zinc-400">
        {profile.heavyTickCount}/{profile.tickCount}
      </td>
      <td className="px-4 py-3 text-right text-xs text-zinc-500">
        {new Date(profile.uploadedAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          className="text-zinc-600 hover:text-red-400 transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────
export default function ProfilerAnalyzer() {
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [savedId,  setSavedId]  = useState<number | null>(null);
  const [ghSyncing, setGhSyncing] = useState(false);

  const savedProfiles = useLiveQuery(() => db.profiles.orderBy('uploadedAt').reverse().toArray(), []);

  // Al montar: si GitHub configurado, carga datos y sincroniza Dexie
  useEffect(() => {
    if (!isGitHubConfigured()) return;
    loadProfilesFromGitHub().then(async (ghProfiles) => {
      if (ghProfiles.length === 0) return;
      // Reemplaza Dexie con los datos de GitHub
      await db.profiles.clear();
      for (const p of ghProfiles) {
        const { id: _, ...data } = p;
        await db.profiles.add(data as StoredProfile);
      }
    }).catch(() => { /* silencioso si no hay conexión */ });
  }, []);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setSavedId(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as unknown;
      const result = parseProfilerFile(json, file.name);
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el archivo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!analysis) return;
    setSaving(true);
    try {
      const id = await db.profiles.add({ ...analysis });
      setSavedId(id as number);
      // Sync GitHub en background
      if (isGitHubConfigured()) {
        setGhSyncing(true);
        db.profiles.orderBy('uploadedAt').reverse().toArray()
          .then(pushProfiles)
          .catch(() => {})
          .finally(() => setGhSyncing(false));
      }
    } catch {
      setError('Error al guardar en la base de datos.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await db.profiles.delete(id);
    if (savedId === id) setSavedId(null);
    // Sync GitHub en background
    if (isGitHubConfigured()) {
      setGhSyncing(true);
      db.profiles.orderBy('uploadedAt').reverse().toArray()
        .then(pushProfiles)
        .catch(() => {})
        .finally(() => setGhSyncing(false));
    }
  }

  function loadSaved(profile: StoredProfile) {
    setAnalysis(profile);
    setSavedId(profile.id ?? null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-8">
      {/* Indicador sync GitHub */}
      {ghSyncing && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 justify-end">
          <Loader2 className="h-3 w-3 animate-spin" />
          <Github className="h-3 w-3" />
          Sincronizando con GitHub…
        </div>
      )}

      {/* Hero */}
      {!analysis && !loading && (
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-white">Profiler Analyzer</h1>
          <p className="mt-2 text-zinc-400">
            Sube un profiler file para identificar qué recursos están causando hitches en tu servidor.
          </p>
        </div>
      )}

      {/* Instructions */}
      {!analysis && !loading && (
        <div className="card p-5">
          <p className="font-semibold text-white mb-3">Cómo grabar un profile</p>
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
            <li>En tu consola txAdmin, ejecuta: <code className="tag bg-zinc-800 text-accent">profiler record 300</code> (graba 300 ticks)</li>
            <li>Espera a que termine, luego ejecuta: <code className="tag bg-zinc-800 text-accent">profiler saveJSON myprofile</code></li>
            <li>Descarga el archivo <code className="tag bg-zinc-800 text-zinc-300">myprofile</code> (sin extensión) desde la carpeta <code className="tag bg-zinc-800 text-zinc-300">resources/</code> de tu servidor y súbelo aquí.</li>
          </ol>
        </div>
      )}

      {/* Dropzone */}
      {!loading && (
        <FileDropzone
          onFile={handleFile}
          accept="*"
          label="Arrastra tu profiler file aquí"
          hint="o haz clic para explorar · .json o sin extensión (myprofile) ambos funcionan"
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-zinc-400">Analizando profiler…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-red-400" />
          <div>
            <p className="font-semibold text-red-400">Error al analizar el archivo</p>
            <p className="text-sm text-red-300/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {analysis && !loading && (
        <AnalysisResult
          analysis={analysis}
          onSave={handleSave}
          saving={saving}
          alreadySaved={savedId !== null}
        />
      )}

      {/* Saved profiles */}
      {savedProfiles && savedProfiles.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Profiles guardados</h3>
            <span className="text-xs text-zinc-500">{savedProfiles.length} guardados localmente</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40">
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Archivo</th>
                  <th className="px-4 py-2.5 text-left text-xs text-zinc-500">Grade</th>
                  <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Avg/tick</th>
                  <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Heavy ticks</th>
                  <th className="px-4 py-2.5 text-right text-xs text-zinc-500">Fecha</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {savedProfiles.map((p) => (
                  <SavedProfileRow
                    key={p.id}
                    profile={p}
                    onSelect={() => loadSaved(p)}
                    onDelete={() => handleDelete(p.id!)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
