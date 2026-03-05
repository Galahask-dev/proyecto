import type { StoredProfile, StoredCrash } from '../types';

// ─── Config ───────────────────────────────────────────────────────────────────
const KEY_TOKEN = 'gh_pat';
const KEY_OWNER = 'gh_owner';
const KEY_REPO  = 'gh_repo';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo:  string;
}

export function getGitHubConfig(): GitHubConfig | null {
  const token = localStorage.getItem(KEY_TOKEN);
  const owner = localStorage.getItem(KEY_OWNER);
  const repo  = localStorage.getItem(KEY_REPO);
  if (!token || !owner || !repo) return null;
  return { token, owner, repo };
}

export function setGitHubConfig(cfg: GitHubConfig) {
  localStorage.setItem(KEY_TOKEN, cfg.token);
  localStorage.setItem(KEY_OWNER, cfg.owner);
  localStorage.setItem(KEY_REPO, cfg.repo);
}

export function clearGitHubConfig() {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_OWNER);
  localStorage.removeItem(KEY_REPO);
}

export function isGitHubConfigured(): boolean {
  return getGitHubConfig() !== null;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
const API_BASE = 'https://api.github.com';

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Lee un archivo JSON del repo → devuelve { items, sha }
async function fetchFile<T>(cfg: GitHubConfig, path: string): Promise<{ items: T[]; sha: string }> {
  const res = await fetch(
    `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
    { headers: headers(cfg.token) },
  );
  if (res.status === 404) return { items: [], sha: '' };
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['message'] as string) ?? `Error ${res.status} en GitHub API`);
  }
  const file = await res.json() as { content: string; sha: string };
  const decoded = decodeURIComponent(
    escape(atob(file.content.replace(/\n/g, '')))
  );
  return { items: JSON.parse(decoded) as T[], sha: file.sha };
}

// Escribe un archivo JSON al repo
async function pushFile<T>(
  cfg: GitHubConfig,
  path: string,
  items: T[],
  sha: string,
): Promise<string> {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(items, null, 2))));
  const body: Record<string, unknown> = {
    message: `data: sync ${path}`,
    content,
  };
  if (sha) body['sha'] = sha;

  const res = await fetch(
    `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
    { method: 'PUT', headers: headers(cfg.token), body: JSON.stringify(body) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['message'] as string) ?? `Error ${res.status} al escribir en GitHub`);
  }
  const result = await res.json() as { content: { sha: string } };
  return result.content.sha;
}

// ─── SHAs en memoria para evitar re-fetch innecesario ─────────────────────────
let profilesSha = '';
let crashesSha  = '';

// ─── API pública ──────────────────────────────────────────────────────────────

export async function testConnection(cfg: GitHubConfig): Promise<void> {
  const res = await fetch(
    `${API_BASE}/repos/${cfg.owner}/${cfg.repo}`,
    { headers: headers(cfg.token) },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error((err['message'] as string) ?? `No se puede acceder al repositorio (${res.status})`);
  }
}

export async function loadProfilesFromGitHub(): Promise<StoredProfile[]> {
  const cfg = getGitHubConfig();
  if (!cfg) return [];
  const { items, sha } = await fetchFile<StoredProfile>(cfg, 'data/profiles.json');
  profilesSha = sha;
  return items;
}

export async function loadCrashesFromGitHub(): Promise<StoredCrash[]> {
  const cfg = getGitHubConfig();
  if (!cfg) return [];
  const { items, sha } = await fetchFile<StoredCrash>(cfg, 'data/crashes.json');
  crashesSha = sha;
  return items;
}

export async function pushProfiles(profiles: StoredProfile[]): Promise<void> {
  const cfg = getGitHubConfig();
  if (!cfg) return;
  profilesSha = await pushFile(cfg, 'data/profiles.json', profiles, profilesSha);
}

export async function pushCrashes(crashes: StoredCrash[]): Promise<void> {
  const cfg = getGitHubConfig();
  if (!cfg) return;
  crashesSha = await pushFile(cfg, 'data/crashes.json', crashes, crashesSha);
}
