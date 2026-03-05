import Dexie, { type Table } from 'dexie';
import type { StoredProfile, StoredCrash } from '../types';

export class ProfilerDatabase extends Dexie {
  profiles!: Table<StoredProfile, number>;
  crashes!: Table<StoredCrash, number>;

  constructor() {
    super('FiveM_ProfilerDB');
    this.version(1).stores({
      profiles: '++id, fileName, uploadedAt, grade, avgScriptTime',
      crashes: '++id, fileName, uploadedAt, crashModule',
    });
  }
}

export const db = new ProfilerDatabase();
