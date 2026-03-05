// ─── Grades ───────────────────────────────────────────────────────────────────
export type Grade = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

// ─── Profiler types ──────────────────────────────────────────────────────────
export interface TickScript {
  name: string;
  time: number;
}

export interface TickData {
  index: number;
  totalTime: number;
  isHeavy: boolean;
  startTime: number;
  scripts: TickScript[];
}

export interface ScriptStats {
  name: string;
  resource: string;
  totalTime: number;
  avgTimePerTick: number;
  maxTime: number;
  tickCount: number;
  heavyTickCount: number;
}

export interface ProfileAnalysis {
  fileName: string;
  uploadedAt: Date;
  tickCount: number;
  heavyTickCount: number;
  avgScriptTime: number;
  maxScriptTime: number;
  grade: Grade;
  ticks: TickData[];
  scripts: ScriptStats[];
  topCpuHogs: ScriptStats[];
  topSpikes: ScriptStats[];
  topHitchDrivers: ScriptStats[];
}

export interface StoredProfile extends ProfileAnalysis {
  id?: number;
}

// ─── Crash types ─────────────────────────────────────────────────────────────
export interface CrashAnalysis {
  fileName: string;
  uploadedAt: Date;
  // Module / exception
  crashModule: string;
  crashModuleOffset: string;
  exceptionCode: string;
  exceptionName: string;
  exceptionAddress: string;
  violationType: string;      // "lectura" | "escritura" | ""
  // System
  buildNumber: string;
  gameVersion: string;
  clientVersion: string;
  osVersion: string;
  architecture: string;       // "x64" | "x86" | ""
  // Meta
  crashHash: string;          // e.g. "glucose-sodium-nineteen"
  crashReason: string;        // human-readable reason
  confidence: string;         // "Alta" | "Media" | "Baja"
  // Log data
  recentLogErrors: string[];
  lastLogLines: string[];
  // Raw
  stackTrace: string;
  fileNames: string[];
  rawJson: Record<string, unknown> | null;
}

export interface StoredCrash extends CrashAnalysis {
  id?: number;
}

// ─── Aggregated offender types ───────────────────────────────────────────────
export interface ScriptOffender {
  name: string;
  resource: string;
  serversCount: number;
  avgCpuPerFrame: number;
  worstTick: number;
}

export interface CrashOffender {
  module: string;
  timesSeen: number;
  exceptionCodes: string[];
}
