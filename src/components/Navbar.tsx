import { Activity, AlertTriangle, Flame, Cpu, Info as InfoIcon, Github } from 'lucide-react';
import { isGitHubConfigured } from '../lib/githubStorage';

type Tab = 'profiler' | 'crash' | 'top-scripts' | 'top-crashes' | 'info';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onGitHubClick: () => void;
}

const tabs: { id: Tab; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'profiler',     label: 'Profiler Analyzer',    Icon: Activity },
  { id: 'crash',        label: 'Crash Analyzer',        Icon: AlertTriangle },
  { id: 'top-scripts',  label: 'Top Script Offenders',  Icon: Flame },
  { id: 'top-crashes',  label: 'Top Crash Offenders',   Icon: Cpu },
  { id: 'info',         label: 'Info',                  Icon: InfoIcon },
];

export default function Navbar({ activeTab, onTabChange, onGitHubClick }: Props) {
  const ghConfigured = isGitHubConfigured();

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

        {/* Spacer */}
        <div className="flex-1" />

        {/* GitHub sync button */}
        <button
          onClick={onGitHubClick}
          title={ghConfigured ? 'GitHub sincronizado' : 'Configurar GitHub sync'}
          className={[
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
            ghConfigured
              ? 'bg-green-900/30 border-green-700/40 text-green-400 hover:bg-green-900/50'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700',
          ].join(' ')}
        >
          <Github className="h-3.5 w-3.5" />
          {ghConfigured ? 'GitHub ✓' : 'GitHub sync'}
        </button>
      </div>
    </nav>
  );
}
