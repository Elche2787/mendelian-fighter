import { REDUCED_MOTION } from '../config';

const nById = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
  return el as T;
};

export interface NpcDialog { name: string; role: string; text: string; anchorX: number; headY: number }

/** Tombol aksi "BICARA" + balon teks gaya komik; kata-kata muncul satu per satu. Teks dipasang lewat textContent. */
class NpcUI {
  private root = nById('npc-ui');
  private bubble = nById('npc-bubble');
  private typed = nById('npc-text');
  private ghost = nById('npc-ghost');
  private sr = nById('npc-sr');
  private ok = nById<HTMLButtonElement>('npc-ok');
  private redo = nById<HTMLButtonElement>('npc-redo');
  private act = nById<HTMLButtonElement>('act-btn');
  private actCb?: () => void;
  private timer?: number;
  private words: string[] = [];
  private shown = 0;
  private resolve?: () => void;

  constructor() {
    this.act.addEventListener('click', () => this.actCb?.());
    this.typed.addEventListener('click', () => this.revealAll());
    this.bubble.addEventListener('click', (e) => { if (e.target === this.bubble) this.revealAll(); });
    this.redo.addEventListener('click', () => this.type());
    this.ok.addEventListener('click', () => this.close());
  }

  onAct(cb?: () => void): void { this.actCb = cb; }
  showAct(label: string): void {
    this.act.hidden = false;
    const l = this.act.querySelector('.act-label');
    if (l && l.textContent !== label) l.textContent = label;
    this.act.setAttribute('aria-label', `${label} dengan NPC (tombol E)`);
  }
  hideAct(): void { this.act.hidden = true; }
  get isOpen(): boolean { return !this.root.hidden; }

  open(d: NpcDialog): Promise<void> {
    nById('npc-name').textContent = d.name;
    nById('npc-role').textContent = d.role;
    this.ghost.textContent = d.text;
    this.sr.textContent = '';
    this.words = d.text.split(/\s+/).filter(Boolean);
    this.root.hidden = false;
    // posisi: di atas kepala NPC, ekor menunjuk ke NPC
    const vw = window.innerWidth, w = Math.min(vw * 0.94, 580);
    const left = Math.min(Math.max(d.anchorX - w / 2, 8), vw - w - 8);
    const bottom = Math.max(8, window.innerHeight - d.headY + 34);
    this.bubble.style.width = `${w}px`; this.bubble.style.left = `${left}px`; this.bubble.style.bottom = `${bottom}px`;
    this.bubble.style.setProperty('--tail', `${Math.min(88, Math.max(12, ((d.anchorX - left) / w) * 100))}%`);
    this.bubble.style.setProperty('--maxh', `${Math.max(120, window.innerHeight - bottom - 150)}px`);
    this.type();
    return new Promise((res) => { this.resolve = res; });
  }

  private type(): void {
    window.clearTimeout(this.timer);
    this.typed.replaceChildren(); this.shown = 0; this.sr.textContent = '';
    this.ok.disabled = true; this.redo.disabled = true;
    const step = (): void => {
      if (this.shown >= this.words.length) { this.finish(); return; }
      const w = this.words[this.shown++];
      const span = document.createElement('span');
      span.className = 'w'; span.textContent = `${w} `;
      this.typed.append(span);
      const pause = /[.!?]$/.test(w) ? 380 : /[,:;]$/.test(w) ? 200 : 0;
      this.timer = window.setTimeout(step, (REDUCED_MOTION ? 45 : 105) + pause + Math.min(w.length, 10) * 6);
    };
    step();
  }

  private revealAll(): void {
    if (this.shown >= this.words.length) return;
    window.clearTimeout(this.timer);
    while (this.shown < this.words.length) {
      const span = document.createElement('span');
      span.className = 'w'; span.style.animation = 'none'; span.textContent = `${this.words[this.shown++]} `;
      this.typed.append(span);
    }
    this.finish();
  }

  private finish(): void {
    this.sr.textContent = this.words.join(' ');          // dibacakan pembaca layar setelah teks lengkap
    this.ok.disabled = false; this.redo.disabled = false;
    this.ok.focus({ preventScroll: true });
  }

  close(): void {
    window.clearTimeout(this.timer);
    this.root.hidden = true;
    const r = this.resolve; this.resolve = undefined; r?.();
  }
}
export const npcUI = new NpcUI();
