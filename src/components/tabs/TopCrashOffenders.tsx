import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { RefreshCw } from 'lucide-react';
import { db } from '../../db/database';
import type { CrashOffender } from '../../types';

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max((value / max) * 100, 2);
  const color =
    pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-orange-500' : pct > 20 ? 'bg-amber-500' : 'bg-yellow-600';
  return (
    <div className="h-1.5 w-24 rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TopCrashOffenders() {
  const [search, setSearch] = useState('');

  const crashes = useLiveQuery(() => db.crashes.toArray(), []);

  const offenders = useMemo<CrashOffender[]>(() => {
    if (!crashes || crashes.length === 0) return [];

    const map = new Map<string, { codes: Set<string>; count: number }>();
    for (const c of crashes) {
      const key = c.crashModule;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { codes: new Set([c.exceptionName]), count: 1 });
      } else {
        existing.codes.add(c.exceptionName);
        existing.count++;
      }
    }

    return Array.from(map.entries())
      .map(([module, data]) => ({
        module,
        timesSeen: data.count,
        exceptionCodes: Array.from(data.codes),
      }))
      .sort((a, b) => b.timesSeen - a.timesSeen)
      .slice(0, 30);
  }, [crashes]);

  const filtered = offenders.filter((o) =>
    o.module.toLowerCase().includes(search.toLowerCase())
  );

  const maxCount = Math.max(...filtered.map((o) => o.timesSeen), 1);
  const uniqueModules = new Set(offenders.map((o) => o.module)).size;
  const topModule = offenders[0]?.module ?? '—';

  if (!crashes) {
    return <div className="flex items-center justify-center py-24 text-zinc-500">Cargando…</div>;
  }

  if (crashes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Top Crash Offenders</h1>
          <p className="text-zinc-400 mt-1">Agregado de todos los crashes guardados.</p>
        </div>
        <div className="card p-12 text-center text-zinc-500">
          <p className="text-lg font-medium text-zinc-400 mb-2">Sin datos todavía</p>
          <p className="text-sm">Analiza y guarda crash reports en la pestaña <strong className="text-white">Crash Analyzer</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Top Crash Offenders</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Agregado de todos los crash reports guardados.
          </p>
        </div>
        <button
          onClick={() => {}}
          className="btn-ghost flex items-center gap-2"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card px-4 py-4 text-center">
          <p className="text-3xl font-bold text-white">{crashes.length}</p>
          <p className="text-xs text-zinc-500 mt-1">crash reports guardados</p>
        </div>
        <div className="card px-4 py-4 text-center">
          <p className="text-3xl font-bold text-white">{uniqueModules}</p>
          <p className="text-xs text-zinc-500 mt-1">módulos únicos de crash</p>
        </div>
        <div className="card px-4 py-4 text-center">
          <p className="text-sm font-bold text-accent truncate px-2">{topModule}</p>
          <p className="text-xs text-zinc-500 mt-1">#1 módulo de crash</p>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-3">
          <h3 className="font-semibold text-white">Módulos de crash</h3>
          <input
            type="text"
            placeholder="Buscar módulo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto w-48 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/40">
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Módulo</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Veces visto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wide">Códigos de excepción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr key={o.module} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 text-zinc-600 text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-sm text-white">{o.module}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <ProgressBar value={o.timesSeen} max={maxCount} />
                      <span className={`font-mono text-sm font-semibold w-5 text-right ${i === 0 ? 'text-red-400' : 'text-zinc-300'}`}>
                        {o.timesSeen}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {o.exceptionCodes.map((code) => (
                        <span key={code} className="tag bg-zinc-800 text-zinc-300">{code}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-600">
          Top 30 módulos por cantidad de crashes.
        </div>
      </div>

      {/* Legacy hashes note */}
      <div className="card p-4">
        <p className="font-semibold text-white text-sm">Sobre los crashes de Access Violation</p>
        <p className="text-sm text-zinc-400 mt-1">
          Los crashes de Access Violation (0xC0000005) en <code className="font-mono text-xs text-zinc-300">fivem_gtaprocess.exe</code> son los más comunes y pueden
          tener muchas causas. Busca el módulo en los foros de CFX para encontrar fixes conocidos.
        </p>
      </div>
    </div>
  );
}
