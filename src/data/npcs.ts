export interface NpcDef {
  id: string;
  level: number;
  name: string;
  role: string;
  sprite: string;     // kunci tekstur (npc0..npc4)
  x: number;          // posisi di dunia (px) untuk level datar
  plat?: number;      // indeks platform (level menara): NPC berdiri di atas platform tersebut
  text: string;       // materi / kisi-kisi untuk soal battle
}

/**
 * NPC per level. Tambahkan level baru cukup dengan menambah entri di sini.
 * Sprite npc3 (Bu Ratna) dan npc4 (Pak Rimba) belum dipakai: cadangan untuk Level 2 dan seterusnya.
 */
export const NPCS: NpcDef[] = [
  {
    id: 'l1-alel', level: 1, name: 'DR. ALEL', role: 'Peneliti Genetika', sprite: 'npc0', x: 1250,
    text: 'Salam, Petualang! Ingat ini baik-baik. Dominansi tidak sempurna (intermediet) menghasilkan rasio 1 : 2 : 1, seperti Mirabilis merah × putih. Interaksi gen jengger ayam (R dan P) tetap 9 : 3 : 3 : 1, dan munculnya sifat leluhur disebut atavisme. Kriptomeri, gen yang tersembunyi, menghasilkan 9 : 3 : 4. Rumus cepat soal hitungan: jumlah keturunan ÷ 16 × bagian rasio!'
  },
  {
    id: 'l1-lia', level: 1, name: 'LIA', role: 'Asisten Perpustakaan', sprite: 'npc1', x: 2450,
    text: 'Catat ya! Epistasis dominan menghasilkan 12 : 3 : 1, contohnya gandum hitam, kuning, putih. Polimeri menghasilkan 15 : 1, cukup satu gen dominan saja sudah berwarna. Komplementer menghasilkan 9 : 7, dua gen dominan harus hadir bersama. Untuk soal hitungan, bagi jumlah keturunan dengan 16, lalu kalikan dengan bagian rasionya.'
  },
  {
    id: 'l1-tetua', level: 1, name: 'TETUA GEN', role: 'Penjaga Pengetahuan', sprite: 'npc2', x: 3500,
    text: 'Hati-hati, penjaga lembah ada di depan! Gen letal membunuh genotipe tertentu: Yy × Yy menghasilkan keturunan hidup 2 : 1. Pindah silang terjadi pada profase I, dan nilai pindah silang 20% berarti tiap gamet rekombinan 10%. Anak golongan darah O dari IAi × IBi berpeluang 25%. Hemofilia terpaut X: ibu pembawa × ayah normal, anak laki-laki hemofilia 25% dari seluruh anak. Uji silang AaBb × aabb: 1 : 1 : 1 : 1.'
  },
  {
    id: 'l2-ratna', level: 2, name: 'BU RATNA', role: 'Inspektur Laboratorium', sprite: 'npc3', x: 0, plat: 3,
    text: 'Selamat datang di Menara Mendelian! Interaksi antaralel (sealel) terjadi antara alel-alel pada satu lokus. Pada dominansi tidak sempurna, heterozigot tampil intermediet: Antirrhinum merah (RR) × putih (rr) menghasilkan merah muda (Rr), dan F2 berasio 1 : 2 : 1. Pada kodominansi, kedua sifat alel tampak utuh bersamaan, contohnya golongan darah AB dan sapi roan. Ingat, epistasis bukan sealel karena melibatkan gen yang berbeda!'
  },
  {
    id: 'l2-rimba', level: 2, name: 'PAK RIMBA', role: 'Penjelajah Menara', sprite: 'npc4', x: 0, plat: 8,
    text: 'Dengar baik-baik! Alel ganda berarti satu lokus punya tiga atau lebih alel, tetapi satu individu hanya membawa dua. Golongan darah ABO memakai alel IA, IB, dan i: A = IAIA atau IAi, B = IBIB atau IBi, AB = IAIB, O = ii. Pada kelinci, urutan dominansinya C > cch > ch > c. Untuk soal golongan darah, tulis gamet orang tua lalu buat tabel silangnya.'
  },
  {
    id: 'l2-alel', level: 2, name: 'DR. ALEL', role: 'Peneliti Genetika', sprite: 'npc0', x: 0, plat: 12,
    text: 'Kamu hampir sampai di puncak! Bunga di depan itu penjaganya. Gen letal menyebabkan kematian pada genotipe tertentu. Pada tikus kuning, YY mati, sehingga Yy × Yy menghasilkan keturunan hidup 2 kuning : 1 bukan kuning. Pada ayam creeper, Crcr × Crcr membuat 25% embrio CrCr mati. Hitung dulu perbandingan genotipenya, lalu buang yang letal sebelum menghitung rasio fenotipe.'
  }
];
export const npcsForLevel = (level: number): NpcDef[] => NPCS.filter((n) => n.level === level);
