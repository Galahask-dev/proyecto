// Web Worker: parses a profile JSON inside a worker thread so the main
// UI stays responsive even with very large files (hundreds of MB / 1 GB).
import { parseProfilerFile } from './profilerParser';
import type { ProfileAnalysis } from '../types';

interface WorkerInput {
  buffer: ArrayBuffer;
  fileName: string;
}

interface WorkerOutputOk  { ok: true;  result: ProfileAnalysis }
interface WorkerOutputErr { ok: false; error: string }

addEventListener('message', (e: MessageEvent<WorkerInput>) => {
  const { buffer, fileName } = e.data;
  try {
    const text = new TextDecoder().decode(buffer);

    // Detect truncated files before paying the full JSON.parse cost
    const trimmed = text.trimEnd();
    if (trimmed.length > 0) {
      const last = trimmed[trimmed.length - 1];
      if (last !== '}' && last !== ']') {
        postMessage({
          ok: false,
          error:
            `"${fileName}": el archivo parece estar truncado (termina en '${last}' en lugar de '}' o ']'). ` +
            `Puede que la grabación se interrumpió o el archivo se corrompió durante la descarga.`,
        } as WorkerOutputErr);
        return;
      }
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      postMessage({
        ok: false,
        error:
          `"${fileName}": JSON inválido — ${msg}. ` +
          `El archivo puede estar truncado o no ser un profiler de FiveM válido.`,
      } as WorkerOutputErr);
      return;
    }

    const result = parseProfilerFile(json, fileName);
    postMessage({ ok: true, result } as WorkerOutputOk);
  } catch (err) {
    postMessage({
      ok: false,
      error: `"${fileName}": ${err instanceof Error ? err.message : String(err)}`,
    } as WorkerOutputErr);
  }
});
