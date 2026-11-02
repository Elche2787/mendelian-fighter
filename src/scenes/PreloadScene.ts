import Phaser from 'phaser';
import { ENV2_FILES, ENV_IMAGES, ITEM_IMAGES, NPC_IMAGES, FONT_TITLE, FONT_BODY, FRAME, SPRITES, SPRITE_FILES, asset } from '../config';
import { audio } from '../core/audio';
import { ENV2_NAMES } from '../data/levels';
import { makeFxTextures, makeWorldTextures } from '../fx/textures';

export class PreloadScene extends Phaser.Scene {
  private failed: string[] = [];
  constructor() { super('PreloadScene'); }

  preload(): void {
    const { width: w, height: h } = this.scale;
    const bar = this.add.graphics();
    const label = this.add.text(w / 2, h / 2 - 34, 'Memuat dunia Mendelian...', { fontFamily: FONT_TITLE, fontSize: '22px', color: '#fbf1d6' }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 + 40, 'Menyiapkan sprite & suara', { fontFamily: FONT_BODY, fontSize: '14px', color: '#c9c2a8' }).setOrigin(0.5);
    const bw = Math.min(360, w * 0.7);
    this.load.on('progress', (p: number) => {
      bar.clear().fillStyle(0x0b1430, 0.8).fillRoundedRect(w / 2 - bw / 2, h / 2, bw, 14, 7)
        .fillStyle(0xe8c26a, 1).fillRoundedRect(w / 2 - bw / 2 + 2, h / 2 + 2, Math.max(8, (bw - 4) * p), 10, 5);
      label.setText(`Memuat dunia Mendelian... ${Math.round(p * 100)}%`);
    });
    this.load.on('loaderror', (f: Phaser.Loader.File) => { this.failed.push(f.key); });

    for (const s of SPRITE_FILES) this.load.spritesheet(s.key, asset(s.file), { frameWidth: s.fw ?? FRAME, frameHeight: s.fh ?? FRAME });
    for (const e of [...ENV_IMAGES, ...NPC_IMAGES, ...ITEM_IMAGES, ...ENV2_FILES(ENV2_NAMES)]) this.load.image(e.key, asset(e.file));
    const manifest = (this.registry.get('audioManifest') ?? {}) as Record<string, string>;
    for (const [key, file] of Object.entries(manifest)) this.load.audio(key, asset(`audio/${file}`));
  }

  create(): void {
    makeFxTextures(this);
    makeWorldTextures(this);
    // Placeholder aman jika sprite gagal dimuat (game tetap berjalan tanpa crash)
    for (const s of SPRITE_FILES) {
      if (this.textures.exists(s.key) && !this.failed.includes(s.key)) continue;
      const cv = document.createElement('canvas'); const fw = s.fw ?? FRAME, fh = s.fh ?? FRAME; cv.width = fw * 4; cv.height = fh * 3;
      const ctx = cv.getContext('2d');
      if (ctx) { ctx.fillStyle = '#e8c26a'; for (let i = 0; i < 12; i++) ctx.fillRect((i % 4) * fw + fw / 3, Math.floor(i / 4) * fh + fh / 4, fw / 3, fh / 2); }
      if (this.textures.exists(s.key)) this.textures.remove(s.key);
      this.textures.addSpriteSheet(s.key, cv as unknown as HTMLImageElement, { frameWidth: fw, frameHeight: fh });
    }
    (['arka', 'nara'] as const).forEach((id) => {
      const mk = (key: string, sheet: string, rate: number): void => {
        if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(sheet, { start: 0, end: 11 }), frameRate: rate, repeat: -1 });
      };
      mk(`${id}-run`, SPRITES[id].run, 14);
      mk(`${id}-read`, SPRITES[id].read, 6);
    });
    const mk2 = (key: string, sheet: string, end: number, rate: number, repeat: number): void => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers(sheet, { start: 0, end }), frameRate: rate, repeat });
    };
    mk2('rooster-idle', 'rooster-idle', 7, 8, -1);
    mk2('rooster-hit', 'rooster-hit', 7, 14, 0);
    mk2('rooster-attack', 'rooster-attack', 11, 14, 0);
    mk2('arka-combo', 'arka-combo', 9, 16, 0);
    mk2('arka-standby', 'arka-standby', 5, 8, -1);
    mk2('nara-standby', 'nara-standby', 11, 10, -1);
    mk2('nara-cast', 'nara-cast', 11, 15, 0);
    mk2('nara-summon', 'nara-summon', 13, 15, 0);
    if (!this.anims.exists('smoke-loop')) this.anims.create({ key: 'smoke-loop', frames: this.anims.generateFrameNumbers('smoke', { start: 0, end: 5 }), frameRate: 4, repeat: -1, yoyo: true });
    // Kriptomer Flower (standby_03 & hit_01 terpotong di aset asli, jadi tidak dipakai)
    const mk3 = (key: string, frames: number[], rate: number, repeat: number): void => {
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers('boss-flower', { frames }), frameRate: rate, repeat });
    };
    mk3('flower-idle', [0, 1, 3, 1], 6, -1);
    mk3('flower-hit', [1], 4, 0);
    mk3('flower-attack', [8, 9, 10, 11], 8, 0);
    mk3('flower-death', [13, 14, 15, 16], 5, 0);
    audio.setAvailable(Object.keys((this.registry.get('audioManifest') ?? {}) as object).filter((k) => this.cache.audio.exists(k)));
    this.scene.start('MainMenuScene');
  }
}
