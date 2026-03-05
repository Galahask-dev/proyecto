import { useState, useEffect } from 'react';
import { X, Github, CheckCircle, AlertCircle, Loader2, Trash2, RefreshCw } from 'lucide-react';
import {
  getGitHubConfig,
  setGitHubConfig,
  clearGitHubConfig,
  testConnection,
  type GitHubConfig,
} from '../lib/githubStorage';

interface Props {
  onClose: () => void;
  onSynced?: () => void;
}

export default function GitHubSetup({ onClose, onSynced }: Props) {
  const existing = getGitHubConfig();

  const [token, setToken] = useState(existing?.token ?? '');
  const [owner, setOwner] = useState(existing?.owner ?? 'Galahask-dev');
  const [repo,  setRepo]  = useState(existing?.repo  ?? 'proyecto');
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [msg,    setMsg]   = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill owner/repo from URL if possible
  useEffect(() => {
    if (!existing) {
      const m = window.location.hostname.match(/^(.+)\.github\.io$/);
      if (m) setOwner(m[1]);
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0]) setRepo(parts[0]);
    }
  }, [existing]);

  async function handleTest() {
    if (!token || !owner || !repo) {
      setStatus('error');
      setMsg('Completa todos los campos antes de probar la conexión.');
      return;
    }
    setStatus('testing');
    setMsg('');
    try {
      await testConnection({ token, owner, repo } satisfies GitHubConfig);
      setStatus('ok');
      setMsg('¡Conexión exitosa! El repositorio es accesible.');
    } catch (e) {
      setStatus('error');
      setMsg(e instanceof Error ? e.message : 'Error de conexión.');
    }
  }

  async function handleSave() {
    if (!token || !owner || !repo) {
      setStatus('error');
      setMsg('Completa todos los campos.');
      return;
    }
    setSaving(true);
    try {
      await testConnection({ token, owner, repo } satisfies GitHubConfig);
      setGitHubConfig({ token, owner, repo });
      setStatus('ok');
      setMsg('Configuración guardada correctamente.');
      onSynced?.();
      setTimeout(onClose, 1200);
    } catch (e) {
      setStatus('error');
      setMsg(e instanceof Error ? e.message : 'Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    clearGitHubConfig();
    setToken('');
    setStatus('idle');
    setMsg('Configuración eliminada.');
    onSynced?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-zinc-300" />
            <h2 className="font-semibold text-white">Sincronización con GitHub</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Info */}
          <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed space-y-2">
            <p>Los perfiles y crashes se guardarán como archivos JSON en tu repositorio de GitHub
              (<code className="text-blue-300 font-mono text-xs">data/profiles.json</code> y{' '}
              <code className="text-blue-300 font-mono text-xs">data/crashes.json</code>).
            </p>
            <p className="text-zinc-500 text-xs">
              Necesitas un <strong className="text-zinc-400">Personal Access Token (PAT)</strong> con permiso{' '}
              <code className="text-blue-300 text-xs font-mono">repo</code> (classic) o{' '}
              <code className="text-blue-300 text-xs font-mono">contents: write</code> (fine-grained).
              El token se guarda <strong className="text-zinc-400">solo en tu navegador</strong>.
            </p>
          </div>

          {/* PAT */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 uppercase tracking-wide">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <p className="text-xs text-zinc-600">
              Crea uno en → github.com/settings/tokens
            </p>
          </div>

          {/* Owner / Repo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Usuario / Org</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="Galahask-dev"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Repositorio</label>
              <input
                type="text"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                placeholder="proyecto"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Status */}
          {(status !== 'idle' || msg) && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
              status === 'ok'     ? 'bg-green-900/30 border border-green-700/40 text-green-300' :
              status === 'error'  ? 'bg-red-900/30 border border-red-700/40 text-red-300' :
                                    'bg-zinc-800/50 text-zinc-400'
            }`}>
              {status === 'testing' && <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />}
              {status === 'ok'      && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {status === 'error'   && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {msg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={status === 'testing' || saving}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Probar
            </button>
            {existing && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpiar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-sm px-3 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !token}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Github className="h-3.5 w-3.5" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
