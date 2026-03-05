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
    const text   = new TextDecoder().decode(buffer);
    const json   = JSON.parse(text)  as unknown;
    const result = parseProfilerFile(json, fileName);
    postMessage({ ok: true, result } as WorkerOutputOk);
  } catch (err) {
    postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    } as WorkerOutputErr);
  }
});
