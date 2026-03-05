import { Activity, AlertTriangle, Flame, Cpu, Info as InfoIcon } from 'lucide-react';

type Tab = 'profiler' | 'crash' | 'top-scripts' | 'top-crashes' | 'info';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'profiler',     label: 'Profiler Analyzer',    Icon: Activity },
  { id: 'crash',        label: 'Crash Analyzer',        Icon: AlertTriangle },
  { id: 'top-scripts',  label: 'Top Script Offenders',  Icon: Flame },
  { id: 'top-crashes',  label: 'Top Crash Offenders',   Icon: Cpu },
  { id: 'info',         label: 'Info',                  Icon: InfoIcon },
];

export default function Navbar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="sticky top-0 z-20 border-b border-zinc-800 bg-app/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4">
        {tabs.map(({ id, label, Icon }) => {
          const active = id === activeTab;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={[
                'flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors',
                active
                  ? 'border-accent text-accent'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200',
              ].join(' ')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
