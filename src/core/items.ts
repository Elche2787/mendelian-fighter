export type ItemId = 'potion' | 'inject' | 'membrane';
export interface ItemDef { id: ItemId; name: string; desc: string; weight: number }

export const ITEMS: Record<ItemId, ItemDef> = {
  potion: { id: 'potion', name: 'Potion', desc: 'Memulihkan 40 HP.', weight: 4 },
  inject: { id: 'inject', name: 'Gen Inject', desc: 'Serangan berikutnya +50% damage critical.', weight: 3 },
  membrane: { id: 'membrane', name: 'Membran Magic', desc: 'Mengurangi damage musuh 60% selama 1 giliran.', weight: 3 }
};
export const ITEM_IDS: ItemId[] = ['potion', 'inject', 'membrane'];
export type Inventory = Record<ItemId, number>;

const KEY = 'mendelian-fighter-items';
interface Store { inv: Inventory }
const empty = (): Store => ({ inv: { potion: 0, inject: 0, membrane: 0 } });
let mem: Store | null = null;     // cache memori: item tetap bekerja selama sesi walau LocalStorage diblokir/penuh

function read(): Store {
  if (mem) return mem;
  const s = empty();
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (typeof raw === 'object' && raw !== null) {
      const o = raw as { inv?: Record<string, unknown> };
      for (const id of ITEM_IDS) { const n = o.inv?.[id]; if (typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 100) s.inv[id] = n; }
    }
  } catch { /* data rusak: mulai kosong */ }
  mem = s;
  return s;
}
function write(s: Store): void { mem = s; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage penuh/diblokir: cache memori tetap dipakai */ } }

export const getInventory = (): Inventory => ({ ...read().inv });
export function addItem(id: ItemId): void { const s = read(); s.inv[id] = Math.min(99, s.inv[id] + 1); write(s); }
export function consumeItem(id: ItemId): boolean {
  const s = read();
  if (s.inv[id] <= 0) return false;
  s.inv[id] -= 1; write(s); return true;
}
/** Dipanggil saat petualang baru (nama berbeda) memulai permainan. */
export function resetItems(): void { write(empty()); }
/** Item acak berbobot: Potion 40%, Gen Inject 30%, Membran Magic 30%. */
export function randomItem(): ItemId {
  const total = ITEM_IDS.reduce((a, id) => a + ITEMS[id].weight, 0);
  let r = Math.random() * total;
  for (const id of ITEM_IDS) { r -= ITEMS[id].weight; if (r < 0) return id; }
  return 'potion';
}
