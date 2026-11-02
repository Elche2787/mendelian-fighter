import type { CharacterId } from './types';

export const BASE = import.meta.env.BASE_URL;
export const asset = (p: string): string => `${BASE}assets/${p}`;

export const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const SAVE_KEY = 'mendelian-fighter-save';
export const AUDIO_PREF_KEY = 'mendelian-fighter-audio';
export const FONT_TITLE = 'Cinzel, "Palatino Linotype", Georgia, serif';
export const FONT_BODY = 'Nunito, system-ui, sans-serif';

/** Semua spritesheet: 4 x 3 frame, tiap frame 256 x 256 (dibuat oleh tools/process_assets.py). */
export const SPRITES: Record<CharacterId, { read: string; run: string; jump: string }> = {
  arka: { read: 'arka-read', run: 'arka-run', jump: 'arka-jump' },
  nara: { read: 'nara-read', run: 'nara-run', jump: 'nara-jump' }
};
/** Pemetaan frame sheet lompat (indeks 0-11) ke fase gerakan. */
export const JUMP_FRAMES: Record<CharacterId, { windup: number[]; air: number[]; land: number[]; stand: number }> = {
  arka: { windup: [0, 1], air: [2, 3, 4, 5, 6, 7], land: [8, 9, 10], stand: 11 },
  nara: { windup: [0], air: [1, 2, 3, 4, 5], land: [6, 7, 8], stand: 11 }
};
export const SPRITE_FILES: { key: string; file: string; fw?: number; fh?: number }[] = [
  { key: 'arka-read', file: 'sprites/arka-read.png' },
  { key: 'nara-read', file: 'sprites/nara-read.png' },
  { key: 'arka-run', file: 'sprites/arka-run.png' },
  { key: 'nara-run', file: 'sprites/nara-run.png' },
  { key: 'arka-jump', file: 'sprites/arka-jump.png' },
  { key: 'nara-jump', file: 'sprites/nara-jump.png' },
  // pertarungan: sel 448 x 288
  { key: 'rooster-idle', file: 'sprites/rooster-idle.png', fw: 448, fh: 288 },
  { key: 'rooster-hit', file: 'sprites/rooster-hit.png', fw: 448, fh: 288 },
  { key: 'rooster-attack', file: 'sprites/rooster-attack.png', fw: 448, fh: 288 },
  { key: 'arka-combo', file: 'sprites/arka-combo.png', fw: 448, fh: 288 },
  { key: 'arka-standby', file: 'sprites/arka-standby.png', fw: 448, fh: 288 },
  { key: 'nara-standby', file: 'sprites/nara-standby.png', fw: 448, fh: 448 },
  { key: 'nara-cast', file: 'sprites/nara-cast.png', fw: 448, fh: 448 },
  { key: 'nara-summon', file: 'sprites/nara-summon.png', fw: 448, fh: 448 },
  { key: 'smoke', file: 'sprites/smoke.png', fw: 384, fh: 448 },
  { key: 'boss-flower', file: 'sprites/boss-flower.png', fw: 256, fh: 256 }
];
export const FRAME = 256;
export const AUDIO_MANIFEST = 'audio/manifest.json';

/** Aset lingkungan Level 1 (dipotong dari lembar aset oleh tools/process_env.py). */
const ENV_NAMES = ['island0', 'island1', 'falls0', 'falls1', 'falls2', 'ruin0', 'ruin1', 'ruin2', 'ruin3', 'ruin4', 'rock0', 'rune', 'banner0', 'banner1',
  ...Array.from({ length: 16 }, (_, i) => `veg${i}`)];
export const ENV_IMAGES: { key: string; file: string }[] = [
  { key: 'env-backdrop', file: 'env/backdrop.jpg' },
  { key: 'env-ground-tile', file: 'env/ground-tile.png' },
  ...ENV_NAMES.map((n) => ({ key: `env-${n}`, file: `env/${n}.png` }))
];

/** Sprite NPC (npc0..npc4, tinggi 288px). */
export const NPC_IMAGES: { key: string; file: string }[] = Array.from({ length: 5 }, (_, i) => ({ key: `npc${i}`, file: `npcs/npc${i}.png` }));

/** Aset Level 2 (Tower of Mendelian): kunci tekstur = l2-<nama>. */
export const ENV2_FILES = (names: string[]): { key: string; file: string }[] => [
  ...names.map((n) => ({ key: `l2-${n}`, file: `env2/${n}.png` })),
  { key: 'boss-portrait', file: 'sprites/boss-flower-portrait.png' }
];

/** Ikon item 16-bit. */
export const ITEM_IMAGES: { key: string; file: string }[] = ['potion', 'inject', 'membrane'].map((n) => ({ key: `item-${n}`, file: `items/${n}.png` }));
