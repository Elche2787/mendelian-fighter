import type { Quiz } from '../core/battle';
import { asset } from '../config';
import { ITEMS, ITEM_IDS, type Inventory, type ItemId } from '../core/items';

const bById = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
  return el as T;
};
const bSleep = (ms: number): Promise<void> => new Promise((r) => window.setTimeout(r, ms));

/** UI DOM pertarungan: HUD HP, meter combo, panel soal, hasil. Semua teks lewat textContent. */
class BattleUI {
  private root = bById('battle-ui');
  private panel = bById('b-panel');
  private opts = bById('bq-options');
  private fb = bById('bq-feedback');
  private streak = bById('b-streak');
  private announceEl = bById('b-announce');
  private resultEl = bById('b-result');
  private keyHandler?: (e: KeyboardEvent) => void;
  private itemsEl = bById('b-items');
  private buffsEl = bById('b-buffs');
  /** Diisi BattleScene: membaca inventaris & memakai item (true jika berhasil). */
  itemApi?: { get: () => Inventory; use: (id: ItemId) => boolean };
  private itemUsed = false;

  show(): void { this.root.hidden = false; document.body.classList.add('in-battle'); }
  hide(): void { this.root.hidden = true; this.panel.hidden = true; this.resultEl.hidden = true; document.body.classList.remove('in-battle'); this.dropKeys(); }

  setHud(pName: string, pHp: number, pMax: number, eName: string, eHp: number, eMax: number): void {
    bById('bp-name').textContent = pName; bById('be-name').textContent = eName;
    bById('bp-hp').style.width = `${Math.max(0, (pHp / pMax) * 100)}%`;
    bById('be-hp').style.width = `${Math.max(0, (eHp / eMax) * 100)}%`;
    bById('bp-txt').textContent = `HP ${Math.max(0, pHp)} / ${pMax}`;
    bById('be-txt').textContent = `HP ${Math.max(0, eHp)} / ${eMax}`;
  }
  setStreak(n: number, ready = false): void {
    this.streak.querySelectorAll('b').forEach((b, i) => b.classList.toggle('on', i < n));
    this.streak.classList.toggle('ready', ready);
  }
  panelHeight(): number { return this.panel.hidden ? 0 : this.panel.getBoundingClientRect().height; }

  async announce(text: string, ms = 1100): Promise<void> {
    this.announceEl.textContent = text;
    this.announceEl.classList.add('show');
    await bSleep(ms);
    this.announceEl.classList.remove('show');
    await bSleep(250);
  }

  /** Menampilkan soal; selesai (resolve true/false) setelah umpan balik terbaca. */
  async ask(quiz: Quiz, n: number, turnLabel: string): Promise<boolean> {
    bById('bq-type').textContent = quiz.q.type;
    bById('bq-turn').textContent = turnLabel;
    bById('bq-num').textContent = `Soal ${n}`;
    bById('bq-text').textContent = quiz.q.text;
    this.fb.textContent = ''; this.fb.className = 'b-feedback';
    this.itemUsed = false; this.renderItems(false);
    this.opts.replaceChildren();
    const btns: HTMLButtonElement[] = [];
    const picked = new Promise<number>((resolve) => {
      quiz.options.forEach((text, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'b-opt';
        const key = document.createElement('b'); key.textContent = `${'ABCD'[i]}.`;
        b.append(key, document.createTextNode(text));
        b.addEventListener('click', () => resolve(i));
        btns.push(b); this.opts.append(b);
      });
      this.keyHandler = (e: KeyboardEvent): void => {
        const i = ['1', '2', '3', '4'].indexOf(e.key) >= 0 ? Number(e.key) - 1 : ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase());
        if (i >= 0 && i < 4) resolve(i);
      };
      window.addEventListener('keydown', this.keyHandler);
    });
    this.panel.hidden = false;
    btns[0]?.focus({ preventScroll: true });
    const i = await picked;
    this.dropKeys();
    this.renderItems(true);
    const ok = i === quiz.correct;
    btns.forEach((b, j) => { b.disabled = true; if (j === quiz.correct) b.classList.add('ok'); else if (j === i) b.classList.add('bad'); });
    this.fb.className = `b-feedback ${ok ? 'ok' : 'bad'}`;
    this.fb.textContent = `${ok ? 'Tepat! ' : 'Kurang tepat. '}${quiz.q.explain}`;
    await bSleep(ok ? 1500 : 2800);
    this.panel.hidden = true;
    return ok;
  }

  hidePanel(): void { this.panel.hidden = true; }

  /** Deretan tombol item (maksimal 1 item per giliran). */
  private renderItems(lock: boolean): void {
    this.itemsEl.replaceChildren();
    const api = this.itemApi;
    if (!api) return;
    const inv = api.get();
    for (const id of ITEM_IDS) {
      const def = ITEMS[id];
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'b-item'; b.title = def.desc;
      b.setAttribute('aria-label', `${def.name}, jumlah ${inv[id]}. ${def.desc}`);
      const img = document.createElement('img'); img.src = asset(`items/${id}.png`); img.alt = '';
      const txt = document.createElement('span'); txt.textContent = def.name;
      const small = document.createElement('small'); small.textContent = def.desc;
      txt.append(small);
      const cnt = document.createElement('b'); cnt.textContent = `×${inv[id]}`;
      b.append(img, txt, cnt);
      b.disabled = lock || this.itemUsed || inv[id] <= 0;
      b.addEventListener('click', () => {
        if (this.itemUsed) return;
        if (api.use(id)) { this.itemUsed = true; this.renderItems(false); this.note(`${def.name} dipakai!`, true); }
        else this.note('Item tidak bisa dipakai sekarang.', false);
      });
      this.itemsEl.append(b);
    }
  }

  note(text: string, ok: boolean): void { this.fb.className = `b-feedback ${ok ? 'ok' : 'bad'}`; this.fb.textContent = text; }

  /** Penanda efek aktif (Gen Inject & Membran Magic) di bawah HUD. */
  setBuffs(inject: boolean, shield: boolean): void {
    this.buffsEl.replaceChildren();
    const chip = (id: ItemId, label: string): void => {
      const d = document.createElement('div'); d.className = 'b-buff';
      const img = document.createElement('img'); img.src = asset(`items/${id}.png`); img.alt = '';
      d.append(img, document.createTextNode(label)); this.buffsEl.append(d);
    };
    if (inject) chip('inject', 'CRITICAL +50%');
    if (shield) chip('membrane', 'DEFENCE 1 GILIRAN');
  }

  result(title: string, text: string, button: string, lose = false): Promise<void> {
    bById('br-title').textContent = title; bById('br-text').textContent = text;
    const btn = bById<HTMLButtonElement>('br-btn'); btn.querySelector('span')!.textContent = button;
    bById('br-title').parentElement?.classList.toggle('lose', lose);
    this.resultEl.hidden = false; btn.focus();
    return new Promise((res) => btn.addEventListener('click', () => { this.resultEl.hidden = true; res(); }, { once: true }));
  }

  private dropKeys(): void { if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler); this.keyHandler = undefined; }
}
export const battleUI = new BattleUI();
