import { useRef, useState, type DragEvent } from 'react';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  accept: string;
  label: string;
  hint: string;
  disabled?: boolean;
}

export default function FileDropzone({ onFile, accept, label, hint, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onFile(files[0]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={[
        'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed',
        'py-16 px-8 cursor-pointer transition-all select-none',
        dragging
          ? 'border-accent bg-accent/5 scale-[1.01]'
          : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept === '*' ? undefined : accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800">
        {dragging ? (
          <FileText className="h-7 w-7 text-accent" />
        ) : (
          <Upload className="h-7 w-7 text-zinc-400" />
        )}
      </div>
      <div className="text-center">
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}
