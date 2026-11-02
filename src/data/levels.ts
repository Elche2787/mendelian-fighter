export interface EnemyDef {
  name: string; hp: number; dmg: number; exp: number;
  sheet: string; idle: string; hit: string; attack: string; death?: string;
  bodyH: number;          // tinggi tubuh dalam sel (px) untuk penskalaan
  margin: number;         // jarak kaki ke dasar sel (px)
  ranged: boolean;        // true = menembakkan proyektil, tidak maju menyerang
  flip: boolean;          // balik horizontal agar menghadap pemain
  shadowW: number; fx: number;
  hitTint?: number;       // jika sprite 'hit' dipinjam dari frame lain, beri kilatan warna
}

export const ENEMIES: Record<number, EnemyDef> = {
  1: { name: 'Walnut Rooster', hp: 220, dmg: 12, exp: 60, sheet: 'rooster-idle', idle: 'rooster-idle', hit: 'rooster-hit', attack: 'rooster-attack',
       bodyH: 215, margin: 4, ranged: false, flip: false, shadowW: 250, fx: 0xff7a4d },
  2: { name: 'Kriptomer Flower', hp: 240, dmg: 12, exp: 80, sheet: 'boss-flower', idle: 'flower-idle', hit: 'flower-hit', attack: 'flower-attack', death: 'flower-death',
       bodyH: 190, margin: 3, ranged: true, flip: true, shadowW: 170, fx: 0xff5fb0, hitTint: 0xff6a9a }
};

export const LEVEL_NAMES: Record<number, string> = { 1: 'THE VALLEY OF ALLELES', 2: 'TOWER OF MENDELIAN' };

/** Platform Level 2 dalam satuan u (1u = tinggi layar / 720). ux,uy = pusat & permukaan atas. s = skala sprite. */
export interface TowerPlat { key: string; ux: number; uy: number; s: number }
/** Lebar asli sprite platform (px). Dipakai untuk menghitung posisi sehingga celah antar platform selalu terjangkau. */
const NATIVE_W: Record<string, number> = { pijakan_batu_lebar: 211, pijakan_batu_pendek: 200, pijakan_batu_kecil_dengan_panji: 164, pijakan_batu_polos: 190,
  pijakan_batu_jembatan: 227, pijakan_batu_lebar_dengan_panji: 218, pijakan_batu_dengan_panji: 217 };
export const COLLIDE_W = 0.86;           // lebar tabrakan = 86% lebar sprite
const GAP = 115;                          // celah tepi-ke-tepi (u). Jangkauan lompat penuh sekitar 190-220u
// [kunci sprite, skala, kenaikan dari platform sebelumnya (u), celah khusus]
const SPEC: [string, number, number, number?][] = [
  ['pijakan_batu_lebar', 1.5, 0], ['pijakan_batu_pendek', 1.4, 70], ['pijakan_batu_kecil_dengan_panji', 1.4, 80], ['pijakan_batu_polos', 1.4, 70],
  ['pijakan_batu_jembatan', 1.4, 70], ['pijakan_batu_lebar_dengan_panji', 1.4, 90], ['pijakan_batu_pendek', 1.4, 70], ['pijakan_batu_polos', 1.4, 70],
  ['pijakan_batu_dengan_panji', 1.4, 90], ['pijakan_batu_kecil_dengan_panji', 1.4, 80], ['pijakan_batu_jembatan', 1.4, 80], ['pijakan_batu_lebar', 1.4, 80],
  ['pijakan_batu_polos', 1.4, 70], ['pijakan_batu_pendek', 1.4, 70],
  ['pijakan_batu_lebar_dengan_panji', 3.3, 40, 100]            // arena bos (lebar)
];
export const TOWER_PLATS: TowerPlat[] = (() => {
  const out: TowerPlat[] = [];
  SPEC.forEach(([key, s, rise, gap], i) => {
    if (i === 0) { out.push({ key, ux: 380, uy: 1720, s }); return; }
    const p = out[i - 1], wPrev = NATIVE_W[p.key] * p.s * COLLIDE_W, w = NATIVE_W[key] * s * COLLIDE_W;
    out.push({ key, ux: Math.round(p.ux + (wPrev + w) / 2 + (gap ?? GAP)), uy: p.uy - rise, s });
  });
  return out;
})();
export const TOWER_H = 1950;
export const ARENA_INDEX = TOWER_PLATS.length - 1;
export const TOWER_W = TOWER_PLATS[ARENA_INDEX].ux + 700;

export const ENV2_NAMES = ['api_dan_asap', 'asap_kebakaran', 'awan_badai_dan_petir', 'awan_petir_kanan', 'balkon_batu', 'kerajaan_terbakar_background', 'menara_utama_dengan_pijakan',
  'panji_merah', 'petir_ungu', 'pijakan_batu_dengan_panji', 'pijakan_batu_jembatan', 'pijakan_batu_kecil_dengan_panji', 'pijakan_batu_lebar', 'pijakan_batu_lebar_dengan_panji',
  'pijakan_batu_pendek', 'pijakan_batu_polos', 'puncak_menara_terpisah', 'reruntuhan_dinding', 'tembok_reruntuhan_dengan_api', 'tiang_batu'];
