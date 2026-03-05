import { useMemo } from 'react';
import type { TickData } from '../types';

interface Props {
  ticks: TickData[];
}

function tickColor(ms: number): string {
  if (ms >= 25) return 'bg-red-500';
  if (ms >= 15) return 'bg-amber-500';
  if (ms >= 8)  return 'bg-yellow-400';
  return 'bg-emerald-500';
}

export default function TickTimeline({ ticks }: Props) {
  const maxTime = useMemo(
    () => Math.max(...ticks.map((t) => t.totalTime), 1),
    [ticks]
  );
  const heavyCount = ticks.filter((t) => t.isHeavy).length;
  const pct = ((heavyCount / ticks.length) * 100).toFixed(1);

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> &lt; 8ms
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-yellow-400" /> 8–15ms
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> 15–25ms
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> &gt; 25ms (heavy)
        </span>
        <span className="ml-auto text-zinc-500">
          {heavyCount} heavy / {ticks.length} ticks ({pct}%)
        </span>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-px overflow-hidden rounded-lg bg-zinc-950 p-2" style={{ height: 100 }}>
        {ticks.map((tick) => {
          const heightPct = Math.max((tick.totalTime / maxTime) * 100, 2);
          return (
            <div
              key={tick.index}
              title={`Tick ${tick.index + 1}: ${tick.totalTime.toFixed(2)}ms${tick.isHeavy ? ' ⚠ heavy' : ''}`}
              className={`flex-shrink-0 w-1 rounded-[1px] transition-opacity hover:opacity-75 cursor-default ${tickColor(tick.totalTime)}`}
              style={{ height: `${heightPct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
