import Phaser from 'phaser';
import { FONT_BODY, FONT_TITLE, FRAME, JUMP_FRAMES, REDUCED_MOTION, SPRITES } from '../config';
import { setInGame } from '../ui/background';
import { loadSave, startSession, writeSave } from '../core/save';
import { grantVictory } from '../core/battle';
import { npcUI } from '../ui/NpcUI';
import { ITEMS, ITEM_IDS, addItem, getInventory, randomItem, type ItemId } from '../core/items';
import { npcsForLevel, type NpcDef } from '../data/npcs';
import { ARENA_INDEX, ENEMIES, LEVEL_NAMES, TOWER_H, TOWER_PLATS, TOWER_W } from '../data/levels';
import type { PlayerProfile } from '../types';

type Keys = Record<'A' | 'D' | 'W' | 'SPACE', Phaser.Input.Keyboard.Key>;
/** sky: melayang di langit | far: berdiri di cakrawala (di belakang tanah) | near: berdiri di jalur pemain / depan */
type Mode = 'sky' | 'far' | 'near';
interface NpcEntry { def: NpcDef; sprite: Phaser.GameObjects.Sprite; tag: Phaser.GameObjects.Text; mark: Phaser.GameObjects.Text }
interface Prop { img: Phaser.GameObjects.Image; mode: Mode; hRel: number; yRel: number; off: number }

/** Level 1: The Valley of Alleles. Latar = ilustrasi "Stormlit Citadel", dunia = aset dari lembar Benteng Terapung. */
export class ExplorationScene extends Phaser.Scene {
  private profile!: PlayerProfile;
  private worldW = 6400;
  private groundY = 0;
  private feetY = 0;
  private gs = 1;                                  // skala ubin tanah
  private k = 1;                                   // faktor skala UI terhadap tinggi layar
  private controls = false;
  private begun = false;
  private frozen = false;                // fisika dihentikan saat animasi teleport
  private vy = 0;
  private vx = 0;
  private face = 1;
  private ps: 'ground' | 'windup' | 'air' | 'land' = 'ground';
  private pt = 0;
  private coyote = 0;
  private buffer = 0;
  private footT = 0;
  private dustL!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustR!: Phaser.GameObjects.Particles.ParticleEmitter;
  private burst!: Phaser.GameObjects.Particles.ParticleEmitter;
  private touch = { left: false, right: false, jump: false, jumpHeld: false };
  private held = new Set<string>();
  private onKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE') this.actQueued = true;
    this.held.add(e.code);
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') this.touch.jump = true;
  };
  private onKeyUp = (e: KeyboardEvent): void => { this.held.delete(e.code); };
  private onBlur = (): void => { this.held.clear(); };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Keys;
  private backdrop!: Phaser.GameObjects.Image;
  private ground!: Phaser.GameObjects.TileSprite;
  private underfill!: Phaser.GameObjects.Rectangle;
  private player!: Phaser.GameObjects.Sprite;
  private tag!: Phaser.GameObjects.Text;
  private guard?: Phaser.GameObjects.Sprite;
  private guardTag?: Phaser.GameObjects.Text;
  private guardBang?: Phaser.GameObjects.Text;
  private guardX = 0;
  private level = 1;
  private worldH = 0;
  private sky!: Phaser.GameObjects.Image;
  private castle?: Phaser.GameObjects.Image;
  private platImgs: Phaser.GameObjects.Image[] = [];
  private platforms: { x: number; top: number; w: number }[] = [];
  private curPlat = 0;
  private towerLayers: { img: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; ux: number; uy: number; s: number }[] = [];
  private hudTower?: Phaser.GameObjects.Text;
  private hudItems: { img: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text; id: ItemId }[] = [];
  private npcs: NpcEntry[] = [];
  private dialogOpen = false;
  private actQueued = false;
  private hudNotes!: Phaser.GameObjects.Text;
  private inBattle = false;
  private hudG!: Phaser.GameObjects.Graphics;
  private hudInfo!: Phaser.GameObjects.Text;
  private props: Prop[] = [];
  private pads: { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; slot: 'l' | 'r' | 'j' }[] = [];

  constructor() { super('ExplorationScene'); }

  init(data: { profile?: PlayerProfile; level?: number }): void {
    // jalan pintas uji coba: tambahkan #level2 pada alamat halaman untuk langsung ke Tower of Mendelian
    this.level = data.level ?? (window.location.hash === '#level2' ? 2 : 1);
    const fallback = loadSave();
    this.profile = data.profile ?? (this.registry.get('profile') as PlayerProfile | undefined)
      ?? (fallback ? { name: fallback.name, characterId: fallback.characterId, playerLevel: fallback.playerLevel, exp: fallback.exp }
        : startSession('Petualang', 'arka').profile);
    this.registry.set('transitionDone', data.level !== undefined && data.level > 1);   // dari teleport: mulai langsung; selain itu tunggu transisi awan
    this.platImgs = []; this.platforms = []; this.towerLayers = []; this.curPlat = 0; this.castle = undefined;
    this.frozen = false;
    this.begun = false; this.controls = false; this.vy = 0; this.vx = 0; this.face = 1; this.ps = 'ground'; this.pt = 0; this.coyote = 0; this.buffer = 0;
    this.touch = { left: false, right: false, jump: false, jumpHeld: false };
    this.props = []; this.pads = []; this.inBattle = false; this.guard = undefined; this.guardTag = undefined; this.guardBang = undefined;
    this.npcs = []; this.dialogOpen = false; this.actQueued = false;
  }

  create(): void {
    setInGame(true);
    const id = this.profile.characterId;
    if (this.level === 1) {
      this.backdrop = this.add.image(0, 0, 'env-backdrop').setOrigin(0).setScrollFactor(0).setDepth(0);
      this.buildWorld();
      this.underfill = this.add.rectangle(0, 0, 10, 10, 0x15171c).setOrigin(0).setScrollFactor(0).setDepth(5.5);
      this.ground = this.add.tileSprite(0, 0, 10, 10, 'env-ground-tile').setOrigin(0).setScrollFactor(0).setDepth(6);
    } else this.buildTower();

    const dustBase = { emitting: false, lifespan: { min: 380, max: 700 }, scale: { start: 0.22, end: 0.85 }, alpha: { start: 0.5, end: 0 }, tint: 0xd9cba6, speedY: { min: -50, max: -10 } };
    this.dustL = this.add.particles(0, 0, 'dust', { ...dustBase, speedX: { min: -120, max: -30 } }).setDepth(9);
    this.dustR = this.add.particles(0, 0, 'dust', { ...dustBase, speedX: { min: 30, max: 120 } }).setDepth(9);
    this.burst = this.add.particles(0, 0, 'dust', { ...dustBase, lifespan: { min: 450, max: 850 }, scale: { start: 0.3, end: 1.2 }, alpha: { start: 0.6, end: 0 },
      speedX: { min: -180, max: 180 }, speedY: { min: -80, max: -15 } }).setDepth(9);
    this.player = this.add.sprite(280, 0, SPRITES[id].jump, JUMP_FRAMES[id].stand).setOrigin(0.5, 1).setDepth(10);
    this.tag = this.add.text(0, 0, this.profile.name, { fontFamily: FONT_TITLE, fontSize: '16px', color: '#fbf1d6', stroke: '#0b1430', strokeThickness: 4 })
      .setOrigin(0.5, 1).setDepth(12);
    this.buildNpcs();
    npcUI.onAct(() => { this.actQueued = true; });
    if (this.registry.get(`guardDefeated-${this.level}`) !== true) this.buildGuard();
    if (!REDUCED_MOTION) {
      this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: 1920 }, y: { min: 0, max: 900 }, lifespan: { min: 3000, max: 6000 }, speedY: { min: -18, max: -4 }, speedX: { min: -8, max: 8 },
        scale: { start: 0.4, end: 0 }, alpha: { start: 0.8, end: 0 }, blendMode: 'ADD', frequency: 220, quantity: 1
      }).setScrollFactor(0).setDepth(13);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('A,D,W,SPACE') as Keys;
    this.buildPads();
    this.held.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.buildHud();
    this.layout();
    this.scale.on('resize', this.layout, this);
    if (this.level === 2) {                                       // mulai di platform pertama, kamera menyorot lebih ke atas
      const pl = this.platforms[0];
      this.player.setPosition(pl.x, pl.top);
      this.cameras.main.centerOn(pl.x, pl.top - 100 * this.k);
      this.cameras.main.fadeIn(700, 255, 255, 255);
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1, 0, 110 * this.k);
    } else this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    const s = loadSave();
    if (s) writeSave({ ...s, unlockedLevels: Array.from(new Set([...s.unlockedLevels, this.level])) });

    this.game.events.once('transition-complete', this.begin, this);
    this.game.events.on('battle-end', this.onBattleEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('blur', this.onBlur);
      this.game.events.off('transition-complete', this.begin, this);
      this.game.events.off('battle-end', this.onBattleEnd, this);
      npcUI.onAct(undefined); npcUI.hideAct(); if (npcUI.isOpen) npcUI.close();
    });
    this.game.events.emit('exploration-ready');
  }

  /** Menyusun dunia berlapis dari aset lembar: pulau terapung, air terjun, pohon, reruntuhan, batu, tanaman. */
  private buildWorld(): void {
    const R = Phaser.Math.Between, F = Phaser.Math.FloatBetween;
    const spread = (sf: number): number => R(0, Math.round(this.worldW * sf + 1500));
    const add = (key: string, x: number, sf: number, depth: number, mode: Mode, hRel: number, yRel = 0, off = 0, flip = false): Phaser.GameObjects.Image => {
      const img = this.add.image(x, 0, key).setScrollFactor(sf).setDepth(depth).setFlipX(flip);
      this.props.push({ img, mode, hRel, yRel, off });
      return img;
    };
    // pulau terapung (mengambang pelan di langit)
    for (let i = 0; i < 9; i++) {
      const img = add(i % 2 ? 'env-island1' : 'env-island0', spread(0.12), 0.12, 1, 'sky', F(0.12, 0.24), F(0.06, 0.3));
      if (!REDUCED_MOTION) this.tweens.add({ targets: img, angle: { from: -1.5, to: 1.5 }, duration: R(3500, 6000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // tebing & air terjun jauh
    for (let i = 0; i < 7; i++) add(`env-falls${i % 3}`, spread(0.45), 0.45, 3, 'far', F(0.2, 0.3), 0, 0, i % 2 === 0);
    // pohon besar di belakang jalur
    for (let i = 0; i < 16; i++) add('env-veg0', spread(0.8), 0.8, 4, 'far', F(0.3, 0.42), 0, 0, i % 2 === 0);
    // reruntuhan kuno + bendera di jalur pemain
    const span = (this.worldW - 1600) / 9;
    for (let i = 0; i < 9; i++) add(`env-ruin${i % 5}`, 900 + i * span + R(-160, 160), 1, 5, 'near', F(0.34, 0.42), 0, -4, i % 3 === 2);
    add('env-rune', 820, 1, 5, 'near', 0.17, 0, -2);
    // batu & tanaman di depan jalur
    for (let i = 0; i < 12; i++) add('env-rock0', R(300, this.worldW), 1, 11, 'near', F(0.07, 0.11), 0, R(10, 34), i % 2 === 0);
    for (let i = 0; i < 90; i++) add(`env-veg${R(1, 15)}`, R(0, this.worldW), 1, i % 3 === 0 ? 11 : 5, 'near', F(0.05, 0.1), 0, i % 3 === 0 ? R(14, 40) : R(0, 6));
  }

  /** Dipanggil setelah awan terbuka: banner level, sapaan, kontrol aktif. */
  private begin(): void {
    if (this.begun) return;
    this.begun = true;
    if (this.level > 1) { void this.arrive(); return; }
    this.intro();
  }

  private intro(): void {
    this.controls = true;
    this.game.canvas.setAttribute('tabindex', '0');
    window.focus(); this.game.canvas.focus({ preventScroll: true });
    const { width: w, height: h } = this.scale;
    const t1 = this.add.text(w / 2, h * 0.2, `LEVEL ${this.level}`, { fontFamily: FONT_TITLE, fontSize: `${Math.round(18 * this.k + 6)}px`, color: '#e8c26a', stroke: '#0b1430', strokeThickness: 4 });
    const t2 = this.add.text(w / 2, h * 0.27, LEVEL_NAMES[this.level] ?? '', { fontFamily: FONT_TITLE, fontSize: `${Math.round(40 * this.k + 8)}px`, color: '#fbf1d6',
      stroke: '#2a1a06', strokeThickness: 6, align: 'center', wordWrap: { width: w * 0.92 } });
    const t3 = this.add.text(w / 2, h * 0.27 + t2.height + 14, this.level === 1 ? `Petualangan dimulai, ${this.profile.name}!` : `Naiki menara dan kalahkan ${ENEMIES[this.level].name}, ${this.profile.name}!`, { fontFamily: FONT_BODY, fontSize: `${Math.round(22 * this.k + 6)}px`,
      color: '#f6dd9a', stroke: '#0b1430', strokeThickness: 5, align: 'center', wordWrap: { width: w * 0.92 } });
    [t1, t2, t3].forEach((t) => t.setOrigin(0.5, 0).setScrollFactor(0).setDepth(200).setAlpha(0));
    this.tweens.add({ targets: [t1, t2], alpha: 1, duration: 800, hold: 2600, yoyo: true });
    this.tweens.add({ targets: t3, alpha: 1, duration: 700, delay: 900, hold: 2500, yoyo: true, onComplete: () => [t1, t2, t3].forEach((t) => t.destroy()) });
    const hint = this.add.text(w / 2, h - 16, this.level === 1 ? '← → / A D: berlari  ·  ↑ / W / Spasi: melompat  ·  atau pakai tombol di layar' : 'Lompati platform batu ke atas menara  ·  jika jatuh, kamu kembali ke platform terakhir',
      { fontFamily: FONT_BODY, fontSize: '14px', color: '#fbf1d6', stroke: '#0b1430', strokeThickness: 4 }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(150);
    this.tweens.add({ targets: hint, alpha: 0, delay: 7000, duration: 1000, onComplete: () => hint.destroy() });
  }

  update(_t: number, dt: number): void {
    try { this.step(dt); } catch (e) {
      console.error(e);
      (window as unknown as { __showErr?: (m: string) => void }).__showErr?.(`update: ${String(e)}`);
    }
  }

  private puff(x: number, y: number, n: number, toward: number): void {
    if (REDUCED_MOTION) return;
    (toward > 0 ? this.dustL : this.dustR).emitParticleAt(x, y, n);
  }

  private show(key: string, frame: number): void {
    this.player.anims.stop();
    this.player.setTexture(key, frame);
  }

  private step(dt: number): void {
    if (!this.begun && this.registry.get('transitionDone') === true) this.begin();
    if (this.inBattle || this.frozen) return;
    const s = Math.min(dt, 50) / 1000, cam = this.cameras.main, p = this.player, w = this.scale.width, k = this.k;
    const id = this.profile.characterId, JF = JUMP_FRAMES[id];
    const left = this.cursors.left.isDown || this.keys.A.isDown || this.touch.left || this.held.has('ArrowLeft') || this.held.has('KeyA');
    const right = this.cursors.right.isDown || this.keys.D.isDown || this.touch.right || this.held.has('ArrowRight') || this.held.has('KeyD');
    const dir = this.controls ? (right ? 1 : 0) - (left ? 1 : 0) : 0;
    const JUMP = 840 * k, G = 2300 * k, SPEED = 380 * k;
    const jumpHeld = this.touch.jumpHeld || this.held.has('ArrowUp') || this.held.has('KeyW') || this.held.has('Space');
    const pressed = this.touch.jump || Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keys.W)
      || Phaser.Input.Keyboard.JustDown(this.keys.SPACE);
    this.touch.jump = false;
    if (pressed && this.controls) this.buffer = 0.13;                       // jump buffer: tekan sedikit sebelum mendarat tetap terhitung
    this.buffer = Math.max(0, this.buffer - s);
    const grounded = this.supportAt(p.x, p.y) !== null && this.vy >= 0;
    this.coyote = grounded ? 0.09 : Math.max(0, this.coyote - s);           // coyote time: toleransi singkat setelah tepi
    if (dir !== 0) this.face = dir;

    // --- mesin status lompat: windup -> air -> land ---
    if (this.buffer > 0 && this.coyote > 0 && (this.ps === 'ground' || this.ps === 'land')) { this.ps = 'windup'; this.pt = 0.08; this.buffer = 0; this.coyote = 0; }
    if (this.ps === 'windup') {
      this.pt -= s;
      if (this.pt <= 0) { this.vy = -JUMP; this.ps = 'air'; this.puff(p.x, p.y - 2, 7, 1); this.puff(p.x, p.y - 2, 7, -1); this.burst.emitParticleAt(p.x, p.y - 4, 6); }
    }
    // --- gerak horizontal halus (akselerasi, bukan langsung) ---
    const target = dir * SPEED * (this.ps === 'windup' ? 0.45 : this.ps === 'land' ? 0.8 : 1);
    this.vx += (target - this.vx) * Math.min(1, (this.ps === 'air' ? 6 : 13) * s);
    if (dir === 0 && Math.abs(this.vx) < 6) this.vx = 0;
    const nx = Phaser.Math.Clamp(p.x + this.vx * s, 60, this.worldW - 60);
    if (nx !== p.x + this.vx * s) this.vx = 0;
    p.x = nx;
    // --- vertikal: gravitasi lebih berat saat jatuh, lompat bisa dipotong; platform bersifat satu arah (bisa ditembus dari bawah) ---
    if (this.supportAt(p.x, p.y) === null && this.ps !== 'air') this.ps = 'air';       // melangkah keluar dari tepi
    if (this.ps === 'air') {
      let g = G;
      if (this.vy > 0) g *= 1.35;
      else if (!jumpHeld) g *= 2.3;
      this.vy += g * s;
      const y0 = p.y, y1 = y0 + this.vy * s;
      const land = this.vy > 0 ? this.landingBetween(p.x, y0, y1) : null;
      if (land !== null) {
        const impact = Phaser.Math.Clamp(this.vy / JUMP, 0.2, 1.6);
        p.y = land; this.vy = 0;
        this.ps = 'land'; this.pt = 0.2;
        this.puff(p.x, p.y - 2, Math.round(5 + impact * 5), 1); this.puff(p.x, p.y - 2, Math.round(5 + impact * 5), -1);
        this.burst.emitParticleAt(p.x, p.y - 4, Math.round(6 + impact * 6));
      } else p.y = y1;
    }
    if (this.level === 2 && p.y > this.worldH + 120 * k) this.respawn();
    if (this.ps === 'land') {
      this.pt -= s;
      if (this.pt <= 0 || (dir !== 0 && this.pt < 0.12)) this.ps = 'ground';
    }

    // --- animasi ---
    p.setFlipX(this.face < 0);
    const clampI = (i: number, n: number): number => Phaser.Math.Clamp(i, 0, n - 1);
    if (this.ps === 'windup') this.show(SPRITES[id].jump, JF.windup[this.pt > 0.04 ? 0 : JF.windup.length - 1]);
    else if (this.ps === 'air') {
      const v = Phaser.Math.Clamp(this.vy / JUMP, -1, 1);                    // -1 naik cepat ... +1 jatuh cepat
      this.show(SPRITES[id].jump, JF.air[clampI(Math.floor(((v + 1) / 2) * JF.air.length), JF.air.length)]);
    } else if (this.ps === 'land') this.show(SPRITES[id].jump, JF.land[clampI(Math.floor((1 - this.pt / 0.2) * JF.land.length), JF.land.length)]);
    else if (Math.abs(this.vx) > 28 * k) {
      p.anims.play(`${id}-run`, true);
      p.anims.timeScale = Phaser.Math.Clamp(Math.abs(this.vx) / SPEED, 0.6, 1.25);
      this.footT -= s;                                                       // debu di belakang kaki tiap langkah
      if (this.footT <= 0 && Math.abs(this.vx) > SPEED * 0.55) { this.footT = 0.11; this.puff(p.x - this.face * 22 * k, p.y - 2, 2, this.face); }
    } else this.show(SPRITES[id].jump, JF.stand);
    this.tag.setPosition(p.x, p.y - p.displayHeight * 0.92);

    this.checkGuard();
    this.checkNpcs();
    if (this.hudTower && this.platforms.length > 1) {      // progres mendaki menuju arena bos
      const a = this.platforms[0].x, b = this.platforms[this.platforms.length - 1].x;
      this.hudTower.setText(`Menara ${Math.round(Phaser.Math.Clamp((p.x - a) / (b - a), 0, 1) * 100)}%`);
    }
    if (this.level === 1) {       // parallax: latar bergeser pelan mengikuti posisi di dunia, tanah bergulir penuh
      const extra = Math.max(0, this.backdrop.displayWidth - w);
      this.backdrop.x = -extra * Phaser.Math.Clamp(cam.scrollX / Math.max(1, this.worldW - w), 0, 1);
      this.ground.tilePositionX = cam.scrollX / this.gs;
    }
  }

  /** Permukaan tempat berdiri di (x,y), atau null jika melayang. */
  private supportAt(x: number, y: number): number | null {
    if (this.level === 1) return y >= this.feetY - 1 ? this.feetY : null;
    for (let i = 0; i < this.platforms.length; i++) {
      const pl = this.platforms[i];
      if (Math.abs(x - pl.x) <= pl.w / 2 && Math.abs(y - pl.top) <= 3) { this.curPlat = i; return pl.top; }
    }
    return null;
  }

  /** Permukaan yang dilewati saat jatuh dari y0 ke y1 (platform satu arah), atau null. */
  private landingBetween(x: number, y0: number, y1: number): number | null {
    if (this.level === 1) return y1 >= this.feetY ? this.feetY : null;
    let best: number | null = null;
    for (const pl of this.platforms) {
      if (Math.abs(x - pl.x) <= pl.w / 2 && y0 <= pl.top + 1 && y1 >= pl.top && (best === null || pl.top < best)) best = pl.top;
    }
    return best;
  }

  private respawn(): void {
    const pl = this.platforms[this.curPlat] ?? this.platforms[0], p = this.player;
    p.setPosition(pl.x, pl.top); this.vy = 0; this.vx = 0; this.ps = 'ground';
    this.cameras.main.flash(250, 40, 20, 80);
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.3, 'Jatuh! Kembali ke platform terakhir', { fontFamily: FONT_BODY, fontSize: `${Math.round(18 * this.k + 6)}px`, color: '#ffd9a8', stroke: '#0b1430', strokeThickness: 5 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(220);
    this.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 600, onComplete: () => t.destroy() });
  }

  // ---------- NPC pemberi materi ----------
  private rewarded(): Set<string> {
    let set = this.registry.get('npcRewarded') as Set<string> | undefined;
    if (!set) { set = new Set<string>(); this.registry.set('npcRewarded', set); }
    return set;
  }

  private showNote(text: string): void {
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.3, text, { fontFamily: FONT_BODY, fontSize: `${Math.round(16 * this.k + 6)}px`, color: '#f6dd9a', stroke: '#0b1430', strokeThickness: 5 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(260);
    this.tweens.add({ targets: t, alpha: 0, y: t.y - 20, delay: 1400, duration: 600, onComplete: () => t.destroy() });
  }

  private learned(): Set<string> {
    let set = this.registry.get('npcLearned') as Set<string> | undefined;
    if (!set) { set = new Set<string>(); this.registry.set('npcLearned', set); }
    return set;
  }

  private buildNpcs(): void {
    for (const def of npcsForLevel(this.level)) {
      const sprite = this.add.sprite(def.x, 0, def.sprite).setOrigin(0.5, 1).setDepth(8);
      const tag = this.add.text(0, 0, def.name, { fontFamily: FONT_TITLE, fontSize: '15px', color: '#cfe9ff', stroke: '#0b1430', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(12);
      const mark = this.add.text(0, 0, '!', { fontFamily: FONT_TITLE, fontSize: '34px', color: '#ffd23f', stroke: '#1a1020', strokeThickness: 6 }).setOrigin(0.5, 1).setDepth(12);
      this.npcs.push({ def, sprite, tag, mark });
    }
  }

  private checkNpcs(): void {
    if (this.npcs.length === 0) return;
    const p = this.player, learned = this.learned();
    let near: NpcEntry | undefined, best = Infinity;
    for (const n of this.npcs) {
      const sp = n.sprite, dx = Math.abs(p.x - sp.x);
      n.tag.setPosition(sp.x, sp.y - sp.displayHeight - 4 * this.k);
      const done = learned.has(n.def.id);
      n.mark.setText(done ? '✓' : '!').setColor(done ? '#9be564' : '#ffd23f')
        .setPosition(sp.x, sp.y - sp.displayHeight - 26 * this.k + (done ? 0 : Math.sin(this.time.now / 140) * 5));
      if (dx < sp.displayWidth * 0.5 + 150 * this.k && dx < best) { best = dx; near = n; }
    }
    const can = !!near && this.controls && !this.dialogOpen && !this.inBattle && this.ps === 'ground';
    if (can && near) {
      npcUI.showAct('BICARA');
      if (this.actQueued) { this.actQueued = false; void this.openNpc(near); }
    } else { npcUI.hideAct(); this.actQueued = false; }
  }

  private async openNpc(n: NpcEntry): Promise<void> {
    this.dialogOpen = true; this.controls = false; this.vx = 0; this.held.clear();
    this.touch = { left: false, right: false, jump: false, jumpHeld: false };
    npcUI.hideAct();
    this.face = n.sprite.x > this.player.x ? 1 : -1;
    const rect = this.game.canvas.getBoundingClientRect();
    const sx = rect.left + (n.sprite.x - this.cameras.main.scrollX), hy = rect.top + n.sprite.y - n.sprite.displayHeight;
    await npcUI.open({ name: n.def.name, role: n.def.role, text: n.def.text, anchorX: sx, headY: hy - 28 * this.k });
    this.learned().add(n.def.id);
    const given = this.rewarded();
    if (!given.has(n.def.id)) { given.add(n.def.id); const item = randomItem(); addItem(item); this.showReward(item); }   // setiap NPC memberi 1 item per petualangan
    else this.showNote('Item dari NPC ini sudah kamu ambil.');
    this.drawHud();
    this.dialogOpen = false; this.controls = true; this.held.clear();
    this.game.canvas.focus({ preventScroll: true });
  }

  /** Hadiah item acak setelah selesai belajar dari NPC: ikon 16-bit muncul dengan efek kilau. */
  private showReward(item: ItemId): void {
    const { width: w, height: h } = this.scale, def = ITEMS[item];
    const cy = h * 0.34;
    const glow = this.add.image(w / 2, cy, 'glow').setScrollFactor(0).setDepth(258).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(260 * this.k, 260 * this.k).setAlpha(0).setTint(0xffe9a8);
    const icon = this.add.image(w / 2, cy, `item-${item}`).setScrollFactor(0).setDepth(260).setScale(0.2).setAlpha(0);
    const target = (96 * this.k + 24) / 128;
    const t1 = this.add.text(w / 2, cy + 74 * this.k + 14, `Kamu mendapat ${def.name}!`, { fontFamily: FONT_TITLE, fontSize: `${Math.round(22 * this.k + 6)}px`, color: '#fbf1d6', stroke: '#1a1020', strokeThickness: 6 })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(260).setAlpha(0);
    const t2 = this.add.text(w / 2, t1.y + t1.height + 6, def.desc, { fontFamily: FONT_BODY, fontSize: `${Math.round(15 * this.k + 4)}px`, color: '#f6dd9a', stroke: '#1a1020', strokeThickness: 4, align: 'center', wordWrap: { width: w * 0.88 } })
      .setOrigin(0.5, 0).setScrollFactor(0).setDepth(260).setAlpha(0);
    this.tweens.add({ targets: icon, scale: target, alpha: 1, duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [glow, t1, t2], alpha: 1, duration: 360 });
    if (!REDUCED_MOTION) {
      this.tweens.add({ targets: icon, y: cy - 8, duration: 700, yoyo: true, repeat: 2, ease: 'Sine.easeInOut', delay: 420 });
      const sp = this.add.particles(w / 2, cy, 'spark', { emitting: false, speed: { min: 80, max: 320 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0 }, lifespan: 700, blendMode: 'ADD', tint: 0xffd36b })
        .setScrollFactor(0).setDepth(259);
      sp.explode(28);
      this.time.delayedCall(900, () => sp.destroy());
    }
    this.tweens.add({ targets: [icon, glow, t1, t2], alpha: 0, delay: 2800, duration: 500, onComplete: () => { icon.destroy(); glow.destroy(); t1.destroy(); t2.destroy(); } });
  }

  // ---------- monster penjaga ----------
  private buildGuard(): void {
    const def = ENEMIES[this.level];
    this.guard = this.add.sprite(0, 0, def.sheet, 0).setOrigin(0.5, 1).setDepth(8);
    this.guard.play(def.idle);
    this.guardTag = this.add.text(0, 0, def.name.toUpperCase(), { fontFamily: FONT_TITLE, fontSize: '18px', color: '#ffb199', stroke: '#2a0a0a', strokeThickness: 5 }).setOrigin(0.5, 1).setDepth(12);
    this.guardBang = this.add.text(0, 0, '!', { fontFamily: FONT_TITLE, fontSize: '44px', color: '#ff5a4d', stroke: '#2a0a0a', strokeThickness: 6 }).setOrigin(0.5, 1).setDepth(12).setAlpha(0);
  }

  private checkGuard(): void {
    const g = this.guard;
    if (!g || !this.controls) return;
    const p = this.player, dx = Math.abs(p.x - g.x);
    this.guardBang?.setAlpha(dx < 760 * this.k ? 1 : 0).setPosition(g.x, g.y - g.displayHeight - 24 * this.k + Math.sin(this.time.now / 120) * 4);
    this.guardTag?.setPosition(g.x, g.y - g.displayHeight - 4 * this.k);
    if (dx < g.displayWidth * 0.3 && p.y > g.y - g.displayHeight * 0.55 && p.y < g.y + 40 * this.k) this.startBattle();
  }

  private startBattle(): void {
    if (this.inBattle) return;
    this.inBattle = true; this.controls = false; npcUI.hideAct(); this.vx = 0; this.vy = 0; this.held.clear();
    this.touch = { left: false, right: false, jump: false, jumpHeld: false };
    this.player.anims.stop(); this.player.setTexture(SPRITES[this.profile.characterId].jump, JUMP_FRAMES[this.profile.characterId].stand);
    this.guard?.play(ENEMIES[this.level].attack);
    if (!REDUCED_MOTION) { this.cameras.main.shake(250, 0.012); this.cameras.main.flash(300, 255, 255, 255); }
    const t = this.add.text(this.scale.width / 2, this.scale.height * 0.3, 'PERTARUNGAN!', { fontFamily: FONT_TITLE, fontSize: `${Math.round(48 * this.k + 8)}px`, color: '#ff8a7a', stroke: '#2a0a0a', strokeThickness: 8 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(250);
    this.time.delayedCall(850, () => {
      t.destroy();
      this.scene.launch('BattleScene', { profile: this.profile, level: this.level });
      this.scene.pause();
    });
  }

  private onBattleEnd(res: { won: boolean }): void {
    this.scene.resume();
    this.inBattle = false;
    this.held.clear();
    if (!res.won) { this.controls = true; return; }
    const lvl = this.level, def = ENEMIES[lvl];
    this.registry.set(`guardDefeated-${lvl}`, true);
    this.profile = grantVictory(this.profile, lvl);
    this.registry.set('profile', this.profile);
    this.drawHud();
    const g = this.guard;
    if (g) {
      this.guardBang?.destroy(); this.guardTag?.destroy();
      g.play(def.death ?? def.hit);
      this.tweens.add({ targets: g, alpha: 0, delay: 700, duration: 800, onComplete: () => g.destroy() });
      this.guard = undefined;
    }
    const { width: w, height: h } = this.scale;
    const sub = lvl === 1 ? `+${def.exp} EXP · Level 2 terbuka · Lv.${this.profile.playerLevel}` : `+${def.exp} EXP · Menara ditaklukkan · Level 3 segera hadir`;
    const t = this.add.text(w / 2, h * 0.25, `LEVEL ${lvl} SELESAI`, { fontFamily: FONT_TITLE, fontSize: `${Math.round(42 * this.k + 8)}px`, color: '#fbf1d6', stroke: '#2a1a06', strokeThickness: 7 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    const t2 = this.add.text(w / 2, h * 0.25 + 56 * this.k + 10, sub, { fontFamily: FONT_BODY, fontSize: `${Math.round(20 * this.k + 6)}px`, color: '#f6dd9a', stroke: '#0b1430', strokeThickness: 5, align: 'center', wordWrap: { width: w * 0.9 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
    this.tweens.add({ targets: [t, t2], alpha: 1, duration: 700, hold: 3000, yoyo: true, onComplete: () => { t.destroy(); t2.destroy(); } });
    if (lvl === 1) this.time.delayedCall(3600, () => { void this.teleportOut(); });   // menuju Tower of Mendelian
    else this.controls = true;
  }

  // ---------- teleport antar level ----------
  private tpEffects(x: number, y: number): { ring: (delay: number) => void; beam: Phaser.GameObjects.Image; sparks: Phaser.GameObjects.Particles.ParticleEmitter } {
    const k = this.k;
    const beam = this.add.image(x, y, 'glow').setOrigin(0.5, 1).setDepth(11).setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(170 * k, 4).setAlpha(0).setTint(0xffe9a8);
    const sparks = this.add.particles(0, 0, 'spark', { emitting: false, x: { min: x - 70 * k, max: x + 70 * k }, y, speedY: { min: -520, max: -980 }, speedX: { min: -30, max: 30 },
      lifespan: { min: 600, max: 1000 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, blendMode: 'ADD', tint: [0xffd36b, 0xb9a2ff, 0xffffff] }).setDepth(12);
    const ring = (delay: number): void => {
      const e = this.add.ellipse(x, y - 2, 20, 8, 0xffffff, 0).setStrokeStyle(4, 0xfff0b0, 1).setDepth(9).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
      this.tweens.add({ targets: e, delay, alpha: { from: 1, to: 0 }, scaleX: 15 * k, scaleY: 15 * k, duration: 900, ease: 'Cubic.easeOut', onComplete: () => e.destroy() });
    };
    return { ring, beam, sparks };
  }

  private async teleportOut(): Promise<void> {
    const p = this.player, k = this.k, id = this.profile.characterId;
    this.controls = false; this.frozen = true; this.vx = 0; this.vy = 0; this.held.clear(); npcUI.hideAct();
    p.anims.stop(); p.setTexture(SPRITES[id].jump, JUMP_FRAMES[id].stand);
    const wait = (ms: number): Promise<void> => new Promise((r) => this.time.delayedCall(ms, () => r()));
    const fx = this.tpEffects(p.x, p.y);
    const sx = p.scaleX;
    fx.ring(0); fx.ring(350); fx.ring(700);
    this.tweens.add({ targets: fx.beam, alpha: 1, displayHeight: 1500 * k, duration: 700, delay: 300, ease: 'Cubic.easeOut' });
    fx.sparks.start();
    await wait(800);
    p.setTintFill(0xffffff);
    this.tweens.add({ targets: p, y: p.y - 230 * k, scaleX: sx * 0.15, alpha: 0, duration: 800, ease: 'Quad.easeIn' });
    await wait(850);
    if (!REDUCED_MOTION) this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.fadeOut(450, 255, 255, 255);
    await wait(520);
    this.scene.restart({ profile: this.profile, level: 2 });
  }

  /** Kedatangan di Level 2: tiang cahaya turun, karakter terbentuk di platform pertama. */
  private async arrive(): Promise<void> {
    const p = this.player, k = this.k;
    const wait = (ms: number): Promise<void> => new Promise((r) => this.time.delayedCall(ms, () => r()));
    this.frozen = true;
    const sx = p.scaleX, y = p.y;
    p.setAlpha(0).setTintFill(0xffffff).setScale(sx * 0.15, p.scaleY).setY(y - 230 * k);
    const fx = this.tpEffects(p.x, y);
    fx.beam.setAlpha(1).setDisplaySize(170 * k, 1500 * k);
    fx.sparks.start();
    fx.ring(200); fx.ring(550);
    await wait(500);
    this.tweens.add({ targets: p, y, scaleX: sx, alpha: 1, duration: 700, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: fx.beam, alpha: 0, displayWidth: 30 * k, duration: 900, delay: 400 });
    await wait(800);
    p.clearTint(); fx.sparks.stop();
    this.time.delayedCall(1200, () => { fx.sparks.destroy(); fx.beam.destroy(); });
    this.vy = 0; this.ps = 'ground'; this.frozen = false;
    this.intro();
  }

  // ---------- Level 2: Tower of Mendelian ----------
  private buildTower(): void {
    const R = Phaser.Math.Between, F = Phaser.Math.FloatBetween;
    this.sky = this.add.image(0, 0, 'l2-sky').setOrigin(0).setScrollFactor(0).setDepth(0);
    const layer = (key: string, sfx: number, sfy: number, ux: number, uy: number, s: number, depth: number, origin: [number, number], alpha = 1, add = false): Phaser.GameObjects.Image => {
      const img = this.add.image(0, 0, `l2-${key}`).setScrollFactor(sfx, sfy).setOrigin(origin[0], origin[1]).setDepth(depth).setAlpha(alpha);
      if (add) img.setBlendMode(Phaser.BlendModes.ADD);
      this.towerLayers.push({ img, ux, uy, s });
      return img;
    };
    // awan badai & petir jauh (parallax)
    for (let i = 0; i < 7; i++) {
      const sfx = F(0.05, 0.14), sfy = F(0.08, 0.16);
      layer(i % 3 === 2 ? 'awan_petir_kanan' : 'awan_badai_dan_petir', sfx, sfy, R(0, Math.round(TOWER_W * sfx + 1500)), (TOWER_H - 720) * sfy + R(-40, 380), F(1.1, 1.9), 1, [0.5, 0.5], 0.85);
    }
    this.castle = this.add.image(0, 0, 'l2-kerajaan_terbakar_background').setScrollFactor(0.06, 0.22).setOrigin(0.5, 1).setDepth(0.5);
    for (let i = 0; i < 3; i++) {
      const sfx = 0.08 + i * 0.03, img = layer('petir_ungu', sfx, 0.12, R(200, Math.round(TOWER_W * sfx + 1200)), (TOWER_H - 720) * 0.12 + R(0, 250), F(1.2, 1.7), 1.2, [0.5, 0], 0, true);
      if (!REDUCED_MOTION) {   // kilat pelan (siklus > 1,5 detik) agar tidak berkedip cepat
        const flash = (): void => { this.tweens.add({ targets: img, alpha: 0.55, duration: 450, yoyo: true, hold: 120, onComplete: () => { this.time.delayedCall(R(3500, 8000), flash); } }); };
        this.time.delayedCall(R(800, 5000), flash);
      }
    }
    // menara utama & arena bos
    const arena = TOWER_PLATS[ARENA_INDEX];
    layer('menara_utama_dengan_pijakan', 1, 1, arena.ux - 300, arena.uy + 900, 1.45, 2, [0.5, 1]);
    layer('tiang_batu', 1, 1, arena.ux - 380, arena.uy + 10, 2.4, 5, [0.5, 1]);
    layer('tiang_batu', 1, 1, arena.ux + 380, arena.uy + 10, 2.4, 5, [0.5, 1]);
    layer('balkon_batu', 1, 1, arena.ux - 140, arena.uy + 8, 2.0, 5.2, [0.5, 1]);
    layer('balkon_batu', 1, 1, arena.ux + 160, arena.uy + 8, 2.0, 5.2, [0.5, 1]);
    // asap ledakan terbakar di dasar menara (sprite animasi 6 frame)
    const nSmoke = Math.ceil(TOWER_W / 430) + 1;
    for (let i = 0; i < nSmoke; i++) {
      const sp = this.add.sprite(0, 0, 'smoke', i % 6).setScrollFactor(1).setOrigin(0.5, 1).setDepth(3).setAlpha(0.92);
      if (!REDUCED_MOTION) sp.play({ key: 'smoke-loop', startFrame: i % 6, frameRate: R(3, 5) });
      this.towerLayers.push({ img: sp, ux: i * 430 + R(-40, 40), uy: TOWER_H + 40, s: F(1.0, 1.35) });
    }
    // platform batu
    TOWER_PLATS.forEach((pl) => this.platImgs.push(this.add.image(0, 0, `l2-${pl.key}`).setOrigin(0.5, 0).setDepth(6)));
  }

  private layoutTower(w: number, h: number): void {
    const k = this.k;
    this.worldW = TOWER_W * k; this.worldH = TOWER_H * k;
    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.sky.setDisplaySize(w, h);
    for (const L of this.towerLayers) L.img.setScale(L.s * k).setPosition(L.ux * k, L.uy * k);
    this.castle?.setScale((w * 1.1) / 800).setPosition(w * 0.45, h + 20 + (this.worldH - h) * 0.22);
    TOWER_PLATS.forEach((pl, i) => {
      const img = this.platImgs[i];
      img.setScale(pl.s * k).setPosition(pl.ux * k, pl.uy * k - 9 * pl.s * k);
      this.platforms[i] = { x: pl.ux * k, top: pl.uy * k, w: img.displayWidth * 0.86 };
    });
    this.npcs.forEach((n) => {
      const pl = this.platforms[n.def.plat ?? 0];
      n.sprite.setScale((h * 0.27) / n.sprite.height).setPosition(pl.x + 40 * k, pl.top + 3);
    });
    const arena = this.platforms[ARENA_INDEX], def = ENEMIES[this.level], gsc = (h * 0.3) / def.bodyH;
    this.guard?.setScale(gsc).setPosition(arena.x + 160 * k, arena.top + def.margin * gsc);
    if (this.vy === 0 && this.platforms[this.curPlat]) this.player.y = this.platforms[this.curPlat].top;
  }

  // ---------- layout & HUD ----------
  private layout(): void {
    const { width: w, height: h } = this.scale;
    this.k = Phaser.Math.Clamp(h / 720, 0.55, 1.5);
    if (this.level === 1) this.layoutValley(w, h); else this.layoutTower(w, h);
    this.player.setScale((h * 0.3) / FRAME);
    this.tag.setFontSize(Math.round(14 * this.k + 4));
    this.pads.forEach((pd) => {
      const x = pd.slot === 'l' ? 60 : pd.slot === 'r' ? 160 : w - 70;
      pd.img.setPosition(x, h - 66); pd.label.setPosition(x, h - 66);
    });
  }

  private layoutValley(w: number, h: number): void {
    this.groundY = Math.round(h * 0.8);
    this.gs = (h - this.groundY + 4) / 104;                 // ubin tanah setinggi 104px mengisi bagian bawah layar
    this.feetY = Math.round(this.groundY + 22 * this.gs);   // garis pijakan = permukaan jalur batu
    this.cameras.main.setBounds(0, 0, this.worldW, h);

    const sc = Math.max((w * 1.1) / this.backdrop.width, h / this.backdrop.height);
    this.backdrop.setScale(sc).setY(h - this.backdrop.height * sc);
    this.ground.setPosition(0, this.groundY).setSize(w, h - this.groundY + 4).setTileScale(this.gs, this.gs);
    this.underfill.setPosition(0, this.groundY + 70 * this.gs).setSize(w, h);

    for (const pr of this.props) {
      const img = pr.img;
      img.setScale((h * pr.hRel) / img.height);
      if (pr.mode === 'sky') img.setOrigin(0.5, 0.5).setY(pr.yRel * h + img.displayHeight / 2);
      else if (pr.mode === 'far') img.setOrigin(0.5, 1).setY(this.groundY + 10 * this.gs);
      else img.setOrigin(0.5, 1).setY(this.feetY + pr.off * this.gs * 0.5);
    }
    this.npcs.forEach((n) => n.sprite.setScale((h * 0.27) / n.sprite.height).setPosition(n.def.x, this.feetY + 3));
    const def = ENEMIES[this.level], gsc = (h * 0.3) / def.bodyH;
    this.guard?.setScale(gsc).setPosition(this.worldW - 2100, this.feetY + def.margin * gsc);
    if (this.vy === 0) this.player.y = this.feetY;
  }

  private buildHud(): void {
    this.hudG = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.add.text(24, 20, this.profile.name, { fontFamily: FONT_TITLE, fontSize: '18px', color: '#fbf1d6' }).setScrollFactor(0).setDepth(101);
    this.hudNotes = this.add.text(250, 20, '', { fontFamily: FONT_BODY, fontSize: '13px', color: '#cfe9ff' }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.hudInfo = this.add.text(24, 42, '', { fontFamily: FONT_BODY, fontSize: '13px', color: '#f6dd9a' }).setScrollFactor(0).setDepth(101);
    if (this.level === 2) this.hudTower = this.add.text(250, 40, '', { fontFamily: FONT_BODY, fontSize: '13px', color: '#ffd9a8' }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);
    this.hudItems = [];
    ITEM_IDS.forEach((id, i) => {
      const img = this.add.image(32 + i * 78, 108, `item-${id}`).setScrollFactor(0).setDepth(101).setScale(30 / 128);
      const txt = this.add.text(50 + i * 78, 108, '×0', { fontFamily: FONT_BODY, fontSize: '14px', color: '#fbf1d6', stroke: '#0b1430', strokeThickness: 4 }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
      this.hudItems.push({ img, txt, id });
    });
    this.drawHud();
  }

  private drawHud(): void {
    const g = this.hudG.clear();
    g.fillStyle(0x0b1430, 0.72).fillRoundedRect(12, 12, 250, 74, 10).lineStyle(2, 0xe8c26a, 0.8).strokeRoundedRect(12, 12, 250, 74, 10);
    const exp = Phaser.Math.Clamp(this.profile.exp / 100, 0, 1);
    g.fillStyle(0x2a3552, 1).fillRoundedRect(24, 62, 226, 10, 5).fillStyle(0xe8c26a, 1).fillRoundedRect(24, 62, Math.max(6, 226 * exp), 10, 5);
    this.hudInfo.setText(`Lv.${this.profile.playerLevel}   EXP ${this.profile.exp}/100`);
    const inv = getInventory();
    this.hudItems.forEach((it) => it.txt.setText(`×${inv[it.id]}`));
    this.hudNotes.setText(`Materi ${this.npcs.filter((n) => this.learned().has(n.def.id)).length}/${this.npcs.length}`);
  }

  private buildPads(): void {
    const mk = (slot: 'l' | 'r' | 'j', label: string, on: (v: boolean) => void): void => {
      const img = this.add.image(0, 0, 'btn').setScrollFactor(0).setDepth(300).setInteractive();
      const t = this.add.text(0, 0, label, { fontFamily: FONT_BODY, fontSize: '30px', color: '#e8c26a' }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
      img.on('pointerdown', () => on(true)); img.on('pointerup', () => on(false)); img.on('pointerout', () => on(false));
      this.pads.push({ img, label: t, slot });
    };
    mk('l', '◀', (v) => { this.touch.left = v; });
    mk('r', '▶', (v) => { this.touch.right = v; });
    mk('j', '▲', (v) => { this.touch.jumpHeld = v; if (v) this.touch.jump = true; });
  }
}
