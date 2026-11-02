import { CHARACTERS } from '../data/characters';
import { validateName } from '../core/save';
import { REDUCED_MOTION, asset } from '../config';
import type { CharacterId } from '../types';

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
  return el as T;
};
const sleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

export interface UIHandlers {
  submit?: (name: string) => void;
  back?: () => void;
  enter?: (id: CharacterId) => void;
  sfx?: (key: string) => void;
}

/** Semua UI DOM (login & pilih karakter). Seluruh teks pemain dipasang lewat textContent (aman dari XSS). */
class DomUI {
  handlers: UIHandlers = {};
  private root = byId('ui');
  private login = byId('screen-login');
  private select = byId('screen-select');
  private form = byId<HTMLFormElement>('login-form');
  private input = byId<HTMLInputElement>('player-name');
  private err = byId('name-error');
  private enterBtn = byId<HTMLButtonElement>('enter-btn');
  private list = byId('char-list');
  private cards = new Map<CharacterId, HTMLButtonElement>();
  private selected: CharacterId | null = null;
  private busy = false;

  constructor() {
    this.buildCards();
    this.input.addEventListener('input', () => this.setError(''));
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = this.form.querySelector<HTMLButtonElement>('button[type=submit]');
      this.pulse(btn);
      const r = validateName(this.input.value);
      if (!r.ok) { this.setError(r.error); this.input.focus(); return; }
      this.handlers.sfx?.('sfx-click');
      this.handlers.submit?.(r.value);
    });
    byId('back-btn').addEventListener('click', () => { if (!this.busy) this.handlers.back?.(); });
    this.enterBtn.addEventListener('click', () => {
      if (!this.selected || this.busy) return;
      this.busy = true;
      this.enterBtn.disabled = true;
      this.pulse(this.enterBtn);
      this.handlers.enter?.(this.selected);
    });
  }

  clear(): void { this.handlers = {}; }

  showLogin(prefill = ''): void {
    this.busy = false;
    document.body.classList.remove('portal-prep', 'warp');
    this.root.removeAttribute('inert');
    this.input.value = prefill;
    this.setError('');
    this.swap(this.select, this.login);
    window.setTimeout(() => this.input.focus({ preventScroll: true }), 350);
  }

  showSelect(name: string, preselect?: CharacterId): void {
    this.busy = false;
    byId('select-name').textContent = `Petualang: ${name}`;
    this.selected = null;
    this.list.classList.remove('has-selection');
    this.cards.forEach((c) => { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); c.tabIndex = 0; });
    this.enterBtn.disabled = true;
    this.swap(this.login, this.select);
    if (preselect) this.choose(preselect, false);
  }

  /** Tahap 1 transisi: UI mengunci, cahaya emas di kartu terpilih, UI memudar, video meredup. */
  async portalPrep(): Promise<void> {
    this.busy = true;
    this.root.setAttribute('inert', '');
    document.body.classList.add('portal-prep');
    await sleep(REDUCED_MOTION ? 250 : 1000);
    this.root.classList.add('leaving');
    await sleep(REDUCED_MOTION ? 100 : 650);
    this.root.hidden = true;
  }

  private buildCards(): void {
    for (const c of CHARACTERS) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'char-card';
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', 'false');
      card.dataset.id = c.id;
      const art = document.createElement('div');
      art.className = 'art';
      art.dataset.initial = c.name[0];
      const img = document.createElement('img');
      img.src = asset(c.portrait);
      img.alt = `Ilustrasi ${c.name}`;
      img.decoding = 'async';
      img.addEventListener('error', () => { img.remove(); card.classList.add('no-img'); });
      art.append(img);
      const name = this.el('div', 'cname', c.name);
      const role = this.el('div', 'crole', c.role);
      const desc = this.el('p', 'cdesc', c.desc);
      const stats = this.el('div', 'stats', '');
      for (const s of c.stats) {
        const bar = document.createElement('i');
        const fill = document.createElement('b');
        fill.style.width = `${s.value}%`;
        bar.append(fill);
        stats.append(this.el('span', '', s.label), bar);
      }
      const sparks = this.el('span', 'sparks', '');
      sparks.setAttribute('aria-hidden', 'true');
      card.append(art, name, role, desc, stats, sparks);
      card.addEventListener('click', () => this.choose(c.id, true));
      card.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
        e.preventDefault();
        const ids = CHARACTERS.map((x) => x.id);
        const i = ids.indexOf(c.id);
        const next = ids[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? ids.length - 1 : 1)) % ids.length];
        this.choose(next, true);
        this.cards.get(next)?.focus();
      });
      this.cards.set(c.id, card);
      this.list.append(card);
    }
  }

  private choose(id: CharacterId, fx: boolean): void {
    if (this.busy) return;
    this.selected = id;
    this.list.classList.add('has-selection');
    this.cards.forEach((card, cid) => {
      const on = cid === id;
      card.classList.toggle('selected', on);
      card.setAttribute('aria-checked', String(on));
    });
    this.enterBtn.disabled = false;
    if (fx) { this.handlers.sfx?.('sfx-click'); this.burst(this.cards.get(id)); }
  }

  private burst(card?: HTMLElement): void {
    const layer = card?.querySelector('.sparks');
    if (!layer || REDUCED_MOTION) return;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110;
      s.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      s.style.setProperty('--dy', `${Math.sin(a) * d - 40}px`);
      s.addEventListener('animationend', () => s.remove());
      layer.append(s);
    }
  }

  private el(tag: string, cls: string, text: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = text;
    return e;
  }
  private pulse(btn: HTMLElement | null): void {
    if (!btn) return;
    btn.classList.add('pressed');
    window.setTimeout(() => btn.classList.remove('pressed'), 200);
  }
  private setError(msg: string): void {
    this.err.textContent = msg;
    if (msg) this.input.setAttribute('aria-invalid', 'true'); else this.input.removeAttribute('aria-invalid');
  }
  private swap(from: HTMLElement, to: HTMLElement): void {
    this.root.hidden = false;
    this.root.classList.remove('leaving');
    from.classList.remove('active');
    window.setTimeout(() => { if (!from.classList.contains('active')) from.hidden = true; }, REDUCED_MOTION ? 0 : 400);
    to.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => to.classList.add('active')));
  }
}

export const ui = new DomUI();
