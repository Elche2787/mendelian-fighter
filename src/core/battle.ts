import type { Question } from '../data/questions';
import { ENEMIES } from '../data/levels';
import { loadSave, writeSave } from './save';
import type { CharacterId, PlayerProfile } from '../types';

export interface Quiz { q: Question; options: string[]; correct: number }
export type AttackKind = 'critical' | 'ultimate';

export const STREAK_FOR_ULTIMATE = 3;

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

/** Tumpukan soal acak: semua 20 soal keluar sekali sebelum diacak ulang. */
export class Deck {
  private queue: Question[] = [];
  private pool: Question[];
  constructor(pool: Question[]) { this.pool = pool; }
  next(): Quiz {
    if (this.queue.length === 0) this.queue = shuffle(this.pool);
    const q = this.queue.pop() as Question;
    const order = shuffle([0, 1, 2, 3]);
    return { q, options: order.map((i) => q.options[i]), correct: order.indexOf(q.answer) };
  }
}

export const maxHp = (id: CharacterId): number => (id === 'nara' ? 120 : 100);
const jitter = (n: number): number => n + Math.round(Math.random() * 6 - 3);
/** Arka (Striker): serangan kuat. Nara (Guardian): serangan lebih kecil tetapi menerima damage lebih sedikit. */
export function playerDamage(id: CharacterId, kind: AttackKind): number {
  const base = id === 'arka' ? (kind === 'ultimate' ? 85 : 38) : (kind === 'ultimate' ? 70 : 30);
  return jitter(base);
}
export function enemyDamage(id: CharacterId, base = 12): number {
  const raw = jitter(base);
  return Math.max(1, Math.round(id === 'nara' ? raw * 0.65 : raw));
}

/** Hadiah kemenangan: EXP, naik level pemain, level yang diselesaikan & level berikutnya terbuka. */
export function grantVictory(profile: PlayerProfile, stage = 1): PlayerProfile {
  let exp = profile.exp + (ENEMIES[stage]?.exp ?? 60), lvl = profile.playerLevel;
  while (exp >= 100) { exp -= 100; lvl += 1; }
  const next: PlayerProfile = { ...profile, exp, playerLevel: lvl };
  const s = loadSave();
  if (s) {
    writeSave({ ...s, playerLevel: lvl, exp, completedLevels: Array.from(new Set([...s.completedLevels, stage])),
      unlockedLevels: Array.from(new Set([...s.unlockedLevels, stage, stage + 1])) });
  }
  return next;
}
