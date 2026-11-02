import Phaser from 'phaser';

const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
type Ctx = CanvasRenderingContext2D;

function canvas(scene: Phaser.Scene, key: string, w: number, h: number): { ctx: Ctx; done: () => void } {
  const t = scene.textures.createCanvas(key, w, h)!;
  return { ctx: t.getContext(), done: () => t.refresh() };
}
function radial(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

/** Tekstur prosedural: percikan emas, cahaya, awan berlapis, tombol sentuh. */
export function makeFxTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('spark')) return;
  let c = canvas(scene, 'spark', 32, 32);
  radial(c.ctx, 16, 16, 16, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,226,140,.9)'], [1, 'rgba(232,194,106,0)']]);
  c.done();
  c = canvas(scene, 'glow', 512, 512);
  radial(c.ctx, 256, 256, 256, [[0, 'rgba(255,240,190,1)'], [0.25, 'rgba(255,205,100,.55)'], [1, 'rgba(232,194,106,0)']]);
  c.done();
  c = canvas(scene, 'dust', 48, 48);
  radial(c.ctx, 24, 24, 24, [[0, 'rgba(240,230,205,.9)'], [0.5, 'rgba(220,206,175,.45)'], [1, 'rgba(200,185,150,0)']]);
  c.done();
  c = canvas(scene, 'btn', 80, 80);
  radial(c.ctx, 40, 40, 38, [[0, 'rgba(20,35,71,.75)'], [1, 'rgba(11,20,48,.75)']]);
  c.ctx.strokeStyle = '#e8c26a'; c.ctx.lineWidth = 3; c.ctx.beginPath(); c.ctx.arc(40, 40, 37, 0, 7); c.ctx.stroke();
  c.done();

  // 4 varian awan 640x360: gumpalan radial + bayangan bawah gelap + tepi atas keemasan
  for (let v = 0; v < 4; v++) {
    const r = rng(97 + v * 31);
    c = canvas(scene, `cloud${v}`, 640, 360);
    for (let i = 0; i < 30; i++) {
      const x = 90 + r() * 460, y = 120 + r() * 120 + Math.sin(x / 90) * 20, rad = 45 + r() * 75;
      radial(c.ctx, x, y, rad, [[0, 'rgba(255,255,255,.95)'], [0.55, 'rgba(214,220,235,.8)'], [1, 'rgba(150,160,185,0)']]);
    }
    c.ctx.globalCompositeOperation = 'source-atop';
    let g = c.ctx.createLinearGradient(0, 120, 0, 340);
    g.addColorStop(0, 'rgba(40,50,80,0)'); g.addColorStop(1, 'rgba(30,38,70,.6)');
    c.ctx.fillStyle = g; c.ctx.fillRect(0, 0, 640, 360);
    g = c.ctx.createLinearGradient(0, 40, 0, 190);
    g.addColorStop(0, 'rgba(255,214,120,.4)'); g.addColorStop(1, 'rgba(255,214,120,0)');
    c.ctx.fillStyle = g; c.ctx.fillRect(0, 0, 640, 360);
    c.done();
  }
}

/** Tekstur dunia Level 1: langit, bukit berlapis, tanah, bunga kacang ercis. */
export function makeWorldTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists('sky')) return;
  let c = canvas(scene, 'sky', 4, 512);
  const g = c.ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#16224a'); g.addColorStop(0.45, '#5f78a8'); g.addColorStop(0.8, '#f0d59a'); g.addColorStop(1, '#fbe9bd');
  c.ctx.fillStyle = g; c.ctx.fillRect(0, 0, 4, 512); c.done();

  c = canvas(scene, 'l2-sky', 4, 512);
  const g2 = c.ctx.createLinearGradient(0, 0, 0, 512);
  g2.addColorStop(0, '#0d0a1f'); g2.addColorStop(0.45, '#2a1646'); g2.addColorStop(0.78, '#7a2a4a'); g2.addColorStop(1, '#d9632f');
  c.ctx.fillStyle = g2; c.ctx.fillRect(0, 0, 4, 512); c.done();

  const hills = (key: string, h: number, base: number, waves: [number, number, number][], top: string, bot: string): void => {
    const k = canvas(scene, key, 1024, h);
    k.ctx.beginPath(); k.ctx.moveTo(0, h);
    for (let x = 0; x <= 1024; x += 4) {
      let y = base;
      waves.forEach(([a, f, p]) => { y += a * Math.sin((2 * Math.PI * f * x) / 1024 + p); });
      k.ctx.lineTo(x, y);
    }
    k.ctx.lineTo(1024, h); k.ctx.closePath();
    const gr = k.ctx.createLinearGradient(0, base - 60, 0, h);
    gr.addColorStop(0, top); gr.addColorStop(1, bot);
    k.ctx.fillStyle = gr; k.ctx.fill();
    k.ctx.strokeStyle = 'rgba(255,225,150,.55)'; k.ctx.lineWidth = 2; k.ctx.stroke();
    k.done();
  };
  hills('hills-far', 360, 140, [[40, 2, 0.5], [22, 5, 2], [10, 9, 1]], '#5d6f9c', '#2a3860');
  hills('hills-near', 300, 110, [[34, 3, 1.2], [16, 7, 0.3], [8, 13, 2.2]], '#3d6b52', '#16342f');

  c = canvas(scene, 'ground', 256, 220);
  const gg = c.ctx.createLinearGradient(0, 0, 0, 220);
  gg.addColorStop(0, '#6fae4f'); gg.addColorStop(0.18, '#3f7d3a'); gg.addColorStop(0.22, '#5b3d22'); gg.addColorStop(1, '#2b1a0e');
  c.ctx.fillStyle = gg; c.ctx.fillRect(0, 0, 256, 220);
  const r = rng(5);
  c.ctx.strokeStyle = '#8fd069'; c.ctx.lineWidth = 2;
  for (let i = 0; i < 70; i++) { const x = r() * 256; c.ctx.beginPath(); c.ctx.moveTo(x, 6); c.ctx.lineTo(x + (r() - 0.5) * 6, -2 + r() * 4); c.ctx.stroke(); }
  c.done();

  const flower = (key: string, petal: string, core: string): void => {
    const f = canvas(scene, key, 40, 72);
    f.ctx.strokeStyle = '#3f7d3a'; f.ctx.lineWidth = 3; f.ctx.beginPath(); f.ctx.moveTo(20, 72); f.ctx.quadraticCurveTo(24, 48, 20, 26); f.ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      radial(f.ctx, 20 + Math.cos(a) * 8, 20 + Math.sin(a) * 8, 8, [[0, petal], [1, petal]]);
    }
    radial(f.ctx, 20, 20, 5, [[0, core], [1, core]]);
    f.done();
  };
  flower('flower-p', '#a56bd6', '#ffe08a');
  flower('flower-w', '#f7f2e6', '#e8c26a');
  c = canvas(scene, 'tuft', 40, 40);
  c.ctx.strokeStyle = '#4f9a45'; c.ctx.lineWidth = 3;
  for (let i = 0; i < 7; i++) { c.ctx.beginPath(); c.ctx.moveTo(20, 40); c.ctx.quadraticCurveTo(20 + (i - 3) * 4, 22, 20 + (i - 3) * 6, 6 + Math.abs(i - 3) * 4); c.ctx.stroke(); }
  c.done();
}

/** Percikan emas yang melayang (dipakai menu & pemilihan karakter). */
export function addAmbientGold(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  scene.add.particles(0, 0, 'spark', {
    x: { min: 0, max: width * 1.2 }, y: { min: height * 0.4, max: height + 20 },
    lifespan: { min: 3500, max: 6500 }, speedY: { min: -40, max: -12 }, speedX: { min: -10, max: 14 },
    scale: { start: 0.55, end: 0 }, alpha: { start: 0.9, end: 0 }, blendMode: 'ADD', frequency: 140, quantity: 1
  }).setDepth(0);
}
