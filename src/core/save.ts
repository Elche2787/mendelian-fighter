import { SAVE_KEY } from '../config';
import { resetItems } from './items';
import type { CharacterId, GameSave, PlayerProfile } from '../types';

export type NameResult = { ok: true; value: string } | { ok: false; error: string };

export function validateName(raw: string): NameResult {
  const value = raw.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Nama wajib diisi dan tidak boleh hanya berisi spasi.' };
  if (value.length < 2) return { ok: false, error: 'Nama terlalu pendek. Gunakan minimal 2 karakter.' };
  if (value.length > 20) return { ok: false, error: 'Nama terlalu panjang. Gunakan maksimal 20 karakter.' };
  if (!/^[\p{L}\p{N} .'’-]+$/u.test(value)) {
    return { ok: false, error: 'Gunakan huruf, angka, spasi, titik, apostrof, atau tanda hubung saja.' };
  }
  return { ok: true, value };
}

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const intList = (v: unknown): number[] | null =>
  Array.isArray(v) && v.every((n) => Number.isInteger(n) && n > 0 && n < 1000) ? (v as number[]) : null;

/** Validasi data mentah dari LocalStorage. Mengembalikan null jika rusak. */
export function parseSave(raw: unknown): GameSave | null {
  if (!isRec(raw) || raw.version !== 1) return null;
  const name = typeof raw.name === 'string' ? validateName(raw.name) : null;
  if (!name || !name.ok) return null;
  if (raw.characterId !== 'arka' && raw.characterId !== 'nara') return null;
  const lvl = raw.playerLevel, exp = raw.exp;
  if (!Number.isInteger(lvl) || (lvl as number) < 1 || (lvl as number) > 99) return null;
  if (!Number.isInteger(exp) || (exp as number) < 0 || (exp as number) > 1e7) return null;
  const unlocked = intList(raw.unlockedLevels), done = intList(raw.completedLevels);
  if (!unlocked || !done) return null;
  return { version: 1, name: name.value, characterId: raw.characterId as CharacterId, playerLevel: lvl as number, exp: exp as number,
    unlockedLevels: unlocked, completedLevels: done };
}

export function loadSave(): GameSave | null {
  try {
    const txt = localStorage.getItem(SAVE_KEY);
    return txt ? parseSave(JSON.parse(txt)) : null;
  } catch {
    return null;
  }
}

export function writeSave(save: GameSave): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* storage penuh/diblokir: abaikan */ }
}

/** Membuat sesi baru; progres lama dipertahankan jika nama yang sama. */
export function startSession(name: string, characterId: CharacterId): { profile: PlayerProfile; save: GameSave } {
  const old = loadSave();
  const keep = old !== null && old.name.toLowerCase() === name.toLowerCase();
  const save: GameSave = {
    version: 1, name, characterId,
    playerLevel: keep ? old.playerLevel : 1, exp: keep ? old.exp : 0,
    unlockedLevels: keep ? old.unlockedLevels : [1], completedLevels: keep ? old.completedLevels : []
  };
  if (!keep) resetItems();                         // petualang baru = inventaris item baru
  writeSave(save);
  return { profile: { name, characterId, playerLevel: save.playerLevel, exp: save.exp }, save };
}
