# Mendelian Fighter — Halaman Awal Sinematik

Phaser 3 + TypeScript + Vite. Login video → pilih karakter → transisi awan → Level 1 "The Valley of Alleles".

## Menjalankan
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build -> dist/
npm run preview
```

## Deploy
- **GitHub**: `git init && git add . && git commit -m "init" && git push`
- **Vercel**: Import repo. Framework Vite terdeteksi otomatis (`vercel.json` sudah ada). Build `npm run build`, output `dist`.

## Aset (semua di `public/assets/`, mudah diganti)
| File | Fungsi |
|---|---|
| `video/login-bg.mp4` | Video latar login (dari bg_game.mp4) |
| `video/login-poster.jpg` | Fallback jika video gagal/diblokir |
| `characters/arka.png`, `nara.png` | Ilustrasi kartu karakter (transparan) |
| `sprites/{arka,nara}-read.png` | Animasi loading/narasi (4x3, 256px/frame) |
| `sprites/{arka,nara}-run.png` | Animasi berlari di Level 1 (4x3, 256px/frame) |
| `audio/manifest.json` | Audio opsional (lihat bawah) |

`tools/process_assets.py` mengubah gambar mentah (latar putih + nomor frame) menjadi PNG transparan dan spritesheet seragam.

### Audio (opsional)
Taruh file di `public/assets/audio/` lalu daftarkan di `manifest.json`:
```json
{ "bgm-login": "login-bgm.mp3", "sfx-wind": "wind.mp3", "sfx-click": "click.mp3",
  "sfx-portal": "portal.mp3", "sfx-transition": "whoosh.mp3" }
```
Tanpa file audio, game tetap berjalan normal.

## Struktur
```
src/
  main.ts                    konfigurasi Phaser + kontrol audio
  config.ts  types.ts
  core/    save.ts (LocalStorage + validasi), audio.ts
  data/    characters.ts (data karakter & teks narasi)
  fx/      textures.ts (awan/cahaya/dunia prosedural)
  ui/      DomUI.ts (login & pilih karakter), background.ts (video)
  scenes/  Boot, Preload, MainMenu, CharacterSelect, CloudTransition, Exploration
```
Save key: `mendelian-fighter-save`. Event antar-scene: `exploration-ready`, `transition-complete`.
Kontrol Level 1: ← → / A D berlari, ↑ / W / Spasi melompat (tombol layar di perangkat sentuh).
