import type { Grade } from '../types';

interface Props {
  grade: Grade;
  size?: 'sm' | 'md' | 'lg';
}

const config: Record<Grade, { label: string; classes: string }> = {
  Excellent: { label: 'Excellent', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  Good:      { label: 'Good',      classes: 'bg-green-500/20 text-green-400 border-green-500/30' },
  Fair:      { label: 'Fair',      classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  Poor:      { label: 'Poor',      classes: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  Critical:  { label: 'Critical',  classes: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const sizes = {
  sm:  'text-xs px-2 py-0.5',
  md:  'text-sm px-2.5 py-1',
  lg:  'text-base px-3 py-1.5',
};

export default function GradeBadge({ grade, size = 'md' }: Props) {
  const { label, classes } = config[grade];
  return (
    <span className={`inline-flex items-center rounded-md border font-semibold ${classes} ${sizes[size]}`}>
      {label}
    </span>
  );
}
