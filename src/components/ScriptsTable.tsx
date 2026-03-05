import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ScriptStats } from '../types';

type SortKey = 'totalTime' | 'avgTimePerTick' | 'maxTime' | 'heavyTickCount' | 'tickCount';

interface Props {
  scripts: ScriptStats[];
  tickCount: number;
}

export default function ScriptsTable({ scripts, tickCount }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('totalTime');
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = scripts.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.resource.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] as number;
    const vb = b[sortKey] as number;
    return sortAsc ? va - vb : vb - va;
  });

  function toggle(key: SortKey) {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="h-3 w-3 opacity-30" />;
    return sortAsc
      ? <ChevronUp className="h-3 w-3 text-accent" />
      : <ChevronDown className="h-3 w-3 text-accent" />;
  }

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Buscar script o recurso…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-accent focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60">
              <th className="px-4 py-3 text-left font-medium text-zinc-400">#</th>
              <th className="px-4 py-3 text-left font-medium text-zinc-400">Script / Event</th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white"
                onClick={() => toggle('totalTime')}
              >
                <span className="inline-flex items-center gap-1">Total CPU <SortIcon col="totalTime" /></span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white"
                onClick={() => toggle('avgTimePerTick')}
              >
                <span className="inline-flex items-center gap-1">Avg/tick <SortIcon col="avgTimePerTick" /></span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white"
                onClick={() => toggle('maxTime')}
              >
                <span className="inline-flex items-center gap-1">Worst tick <SortIcon col="maxTime" /></span>
              </th>
              <th
                className="cursor-pointer px-4 py-3 text-right font-medium text-zinc-400 hover:text-white"
                onClick={() => toggle('heavyTickCount')}
              >
                <span className="inline-flex items-center gap-1">Heavy ticks <SortIcon col="heavyTickCount" /></span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 200).map((s, i) => (
              <tr
                key={s.name}
                className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
              >
                <td className="px-4 py-2.5 text-zinc-500">{i + 1}</td>
                <td className="px-4 py-2.5 max-w-sm">
                  <div className="font-mono text-xs text-white truncate" title={s.name}>{s.name}</div>
                  {s.resource !== s.name && (
                    <div className="text-xs text-zinc-500 mt-0.5">{s.resource}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-300">
                  {s.totalTime.toFixed(1)}ms
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-zinc-300">
                  {s.avgTimePerTick.toFixed(2)}ms
                </td>
                <td className={`px-4 py-2.5 text-right font-mono text-xs ${s.maxTime > 25 ? 'text-red-400' : 'text-zinc-300'}`}>
                  {s.maxTime.toFixed(2)}ms
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">
                  <span className={s.heavyTickCount > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                    {s.heavyTickCount}
                    <span className="text-zinc-500 font-normal">/{tickCount}</span>
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No se encontraron scripts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > 200 && (
        <p className="mt-2 text-xs text-zinc-500 text-right">
          Mostrando 200 de {sorted.length} scripts.
        </p>
      )}
    </div>
  );
}
