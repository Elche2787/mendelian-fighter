export interface Question {
  type: 'HITUNGAN' | 'TEORI';
  text: string;
  options: [string, string, string, string];
  answer: number;          // indeks jawaban benar pada options
  explain: string;
}

/** 20 soal penyimpangan (semu) hukum Mendel. Urutan soal & opsi diacak saat bermain (lihat core/battle.ts). */
export const QUESTIONS: Question[] = [
  { type: 'TEORI', text: 'Mirabilis jalapa merah (MM) disilangkan dengan yang putih (mm); F1 berwarna merah muda. Jika F1 disilangkan sesamanya, rasio fenotipe F2 adalah ...',
    options: ['3 : 1', '1 : 2 : 1', '9 : 3 : 3 : 1', '1 : 1'], answer: 1, explain: 'Dominansi tidak sempurna (intermediet): 1 merah : 2 merah muda : 1 putih.' },
  { type: 'HITUNGAN', text: 'Pada persilangan F1 Mirabilis jalapa merah muda sesamanya dihasilkan 200 tanaman. Perkiraan jumlah tanaman berbunga merah muda adalah ...',
    options: ['50', '100', '150', '200'], answer: 1, explain: 'Rasio 1 : 2 : 1, merah muda = 2/4 × 200 = 100.' },
  { type: 'TEORI', text: 'Munculnya sifat leluhur pada keturunan akibat interaksi gen, misalnya jengger walnut dari persilangan ayam rose × pea, disebut ...',
    options: ['Atavisme', 'Kriptomeri', 'Polimeri', 'Epistasis'], answer: 0, explain: 'Atavisme: interaksi gen R dan P memunculkan jengger walnut yang menyerupai leluhur.' },
  { type: 'HITUNGAN', text: 'Jengger ayam ditentukan gen R dan P (R_P_ walnut, R_pp rose, rrP_ pea, rrpp single). Persilangan RrPp × RrPp menghasilkan walnut : rose : pea : single = ...',
    options: ['9 : 3 : 3 : 1', '12 : 3 : 1', '9 : 3 : 4', '9 : 7'], answer: 0, explain: 'Keempat fenotipe muncul dengan rasio dihibrid 9 : 3 : 3 : 1.' },
  { type: 'HITUNGAN', text: 'Dari persilangan RrPp × RrPp diperoleh 160 anak ayam. Perkiraan jumlah anak ayam berjengger walnut adalah ...',
    options: ['30', '60', '90', '120'], answer: 2, explain: '9/16 × 160 = 90 ekor.' },
  { type: 'HITUNGAN', text: 'Dari persilangan RrPp × RrPp diperoleh 320 anak ayam. Perkiraan jumlah anak ayam berjengger single (rrpp) adalah ...',
    options: ['20', '40', '60', '80'], answer: 0, explain: '1/16 × 320 = 20 ekor.' },
  { type: 'TEORI', text: 'Gen yang baru tampak pengaruhnya jika bertemu dengan gen dominan lain yang bukan alelnya (pigmen tersembunyi) disebut peristiwa ...',
    options: ['Polimeri', 'Atavisme', 'Kriptomeri', 'Pautan'], answer: 2, explain: 'Kriptomeri: gen tersembunyi, contohnya warna bunga Linaria maroccana.' },
  { type: 'HITUNGAN', text: 'Pada Linaria maroccana, A_B_ ungu, A_bb merah, aa__ putih (kriptomeri). Persilangan AaBb × AaBb menghasilkan ungu : merah : putih = ...',
    options: ['9 : 3 : 4', '12 : 3 : 1', '9 : 7', '15 : 1'], answer: 0, explain: 'A_B_ = 9, A_bb = 3, aaB_ + aabb = 4, sehingga 9 : 3 : 4.' },
  { type: 'HITUNGAN', text: 'Pada gandum, gen H (hitam) epistasis terhadap K (kuning): H_ hitam, hhK_ kuning, hhkk putih. HhKk × HhKk menghasilkan hitam : kuning : putih = ...',
    options: ['9 : 3 : 4', '12 : 3 : 1', '9 : 7', '15 : 1'], answer: 1, explain: 'H_ (9 + 3) = 12 hitam, hhK_ = 3 kuning, hhkk = 1 putih.' },
  { type: 'HITUNGAN', text: 'Dari persilangan gandum HhKk × HhKk diperoleh 160 tanaman. Perkiraan jumlah tanaman berbiji kuning adalah ...',
    options: ['10', '30', '90', '120'], answer: 1, explain: '3/16 × 160 = 30 tanaman.' },
  { type: 'HITUNGAN', text: 'Warna merah biji gandum ditentukan dua gen polimeri (M1 dan M2). Persilangan M1m1M2m2 × M1m1M2m2 menghasilkan merah : putih = ...',
    options: ['9 : 7', '12 : 3 : 1', '15 : 1', '3 : 1'], answer: 2, explain: 'Selama ada satu gen dominan biji merah, hanya m1m1m2m2 yang putih: 15 : 1.' },
  { type: 'HITUNGAN', text: 'Pada polimeri rasio 15 : 1, persilangan sesama F1 menghasilkan 480 tanaman. Perkiraan jumlah tanaman berbiji putih adalah ...',
    options: ['15', '30', '45', '60'], answer: 1, explain: '1/16 × 480 = 30 tanaman.' },
  { type: 'HITUNGAN', text: 'Bunga Lathyrus odoratus berwarna ungu jika ada gen C dan P bersama (C_P_), selain itu putih (komplementer). CcPp × CcPp menghasilkan ungu : putih = ...',
    options: ['9 : 7', '9 : 3 : 4', '12 : 4', '15 : 1'], answer: 0, explain: 'C_P_ = 9 ungu; C_pp, ccP_, ccpp = 7 putih.' },
  { type: 'HITUNGAN', text: 'Dari persilangan Lathyrus odoratus CcPp × CcPp diperoleh 160 tanaman. Perkiraan jumlah tanaman berbunga putih adalah ...',
    options: ['50', '60', '70', '90'], answer: 2, explain: '7/16 × 160 = 70 tanaman.' },
  { type: 'TEORI', text: 'Pada tikus, gen Y (kuning) dominan tetapi letal pada keadaan homozigot (YY mati). Persilangan Yy × Yy menghasilkan keturunan hidup dengan rasio kuning : bukan kuning = ...',
    options: ['3 : 1', '1 : 1', '2 : 1', '1 : 2'], answer: 2, explain: 'YY mati, sisanya 2 Yy (kuning) : 1 yy = 2 : 1.' },
  { type: 'HITUNGAN', text: 'Individu AB/ab (gen terpaut) mengalami pindah silang dengan nilai 20%. Persentase gamet rekombinan Ab yang terbentuk adalah ...',
    options: ['10%', '20%', '40%', '80%'], answer: 0, explain: 'Rekombinan 20% terbagi dua jenis: Ab = aB = 10%.' },
  { type: 'TEORI', text: 'Pertukaran segmen antar kromatid yang bukan saudara pada profase I meiosis yang menghasilkan gamet rekombinan disebut ...',
    options: ['Mutasi gen', 'Pindah silang', 'Nondisjunction', 'Gen letal'], answer: 1, explain: 'Pindah silang (crossing over) terjadi pada profase I, tahap sinapsis kromosom homolog.' },
  { type: 'HITUNGAN', text: 'Ibu bergolongan darah A heterozigot (IAi) menikah dengan ayah bergolongan darah B heterozigot (IBi). Peluang anak bergolongan darah O adalah ...',
    options: ['0%', '25%', '50%', '75%'], answer: 1, explain: 'Gamet: IA, i × IB, i. Anak ii = 1/4 = 25%.' },
  { type: 'HITUNGAN', text: 'Ibu pembawa hemofilia (XHXh) menikah dengan ayah normal (XHY). Peluang anak laki-laki hemofilia dari seluruh anak adalah ...',
    options: ['0%', '25%', '50%', '100%'], answer: 1, explain: 'Dari 4 kemungkinan anak, hanya XhY (1 dari 4) yang hemofilia = 25%.' },
  { type: 'HITUNGAN', text: 'Uji silang (test cross) individu AaBb dengan aabb, jika gen bebas bergabung, menghasilkan rasio fenotipe ...',
    options: ['9 : 3 : 3 : 1', '1 : 1', '1 : 1 : 1 : 1', '3 : 1'], answer: 2, explain: 'AaBb membentuk 4 gamet sama banyak (AB, Ab, aB, ab), sehingga 1 : 1 : 1 : 1.' }
];

/** Level 2: Penyimpangan interaksi antaralel (sealel) = interaksi alel pada satu lokus. */
export const QUESTIONS_L2: Question[] = [
  { type: 'TEORI', text: 'Berikut ini yang BUKAN termasuk interaksi antaralel (sealel) adalah ...',
    options: ['Dominansi tidak sempurna', 'Kodominansi', 'Alel ganda', 'Epistasis'], answer: 3, explain: 'Epistasis melibatkan dua gen pada lokus berbeda (interaksi antargen), bukan antaralel.' },
  { type: 'TEORI', text: 'Pada dominansi tidak sempurna (intermediet), fenotipe individu heterozigot adalah ...',
    options: ['Sama dengan induk dominan', 'Berada di antara kedua induknya', 'Sama dengan induk resesif', 'Kedua sifat muncul utuh bersamaan'], answer: 1, explain: 'Heterozigot menampilkan sifat antara kedua induk, misalnya merah × putih menjadi merah muda.' },
  { type: 'HITUNGAN', text: 'Antirrhinum merah (RR) × putih (rr) menghasilkan F1 merah muda. F1 disilangkan sesamanya dan diperoleh 80 tanaman F2. Perkiraan jumlah tanaman berbunga putih adalah ...',
    options: ['10', '20', '40', '60'], answer: 1, explain: 'F2 berasio 1 merah : 2 merah muda : 1 putih. Putih = 1/4 × 80 = 20.' },
  { type: 'HITUNGAN', text: 'Antirrhinum F1 merah muda (Rr) disilangkan dengan putih (rr). Rasio fenotipe keturunannya merah muda : putih adalah ...',
    options: ['1 : 1', '3 : 1', '1 : 2 : 1', '2 : 1'], answer: 0, explain: 'Rr × rr menghasilkan 1 Rr (merah muda) : 1 rr (putih).' },
  { type: 'TEORI', text: 'Pada kodominansi, individu heterozigot menunjukkan ...',
    options: ['Sifat campuran baru di antara kedua induk', 'Hanya sifat dominan', 'Kedua sifat alel muncul utuh secara bersamaan', 'Hanya sifat resesif'], answer: 2, explain: 'Kedua alel terekspresi penuh dan tampak bersamaan pada heterozigot.' },
  { type: 'TEORI', text: 'Golongan darah AB (IAIB) merupakan contoh peristiwa ...',
    options: ['Dominansi penuh', 'Kodominansi', 'Dominansi tidak sempurna', 'Epistasis'], answer: 1, explain: 'Alel IA dan IB sama-sama terekspresi sehingga disebut kodominansi.' },
  { type: 'TEORI', text: 'Sapi berbulu merah (CRCR) disilangkan dengan sapi berbulu putih (CWCW) menghasilkan sapi roan yang bulu merah dan putihnya tampak bersamaan. Peristiwa ini disebut ...',
    options: ['Intermediet', 'Atavisme', 'Kodominansi', 'Polimeri'], answer: 2, explain: 'Warna merah dan putih muncul bersamaan secara utuh pada tiap helai bulu: kodominansi.' },
  { type: 'HITUNGAN', text: 'Dua sapi roan (CRCW) dikawinkan dan lahir 120 anak sapi. Perkiraan jumlah anak sapi roan adalah ...',
    options: ['30', '60', '90', '120'], answer: 1, explain: 'Rasio 1 merah : 2 roan : 1 putih. Roan = 2/4 × 120 = 60.' },
  { type: 'TEORI', text: 'Alel ganda (multiple alleles) adalah ...',
    options: ['Dua gen berbeda yang mengatur satu sifat', 'Tiga atau lebih bentuk alel pada satu lokus', 'Gen yang menyebabkan kematian', 'Gen yang terletak pada kromosom yang sama'], answer: 1, explain: 'Pada satu lokus terdapat lebih dari dua alel, tetapi satu individu hanya membawa dua di antaranya.' },
  { type: 'TEORI', text: 'Jumlah alel yang mengatur golongan darah sistem ABO adalah ...',
    options: ['2', '3', '4', '6'], answer: 1, explain: 'Alel IA, IB, dan i.' },
  { type: 'TEORI', text: 'Genotipe yang menghasilkan golongan darah A adalah ...',
    options: ['IAIA atau IAi', 'Hanya IAIA', 'IAIB', 'ii'], answer: 0, explain: 'IA dominan terhadap i, sehingga IAIA dan IAi sama-sama bergolongan darah A.' },
  { type: 'HITUNGAN', text: 'Ayah bergolongan darah AB menikah dengan ibu bergolongan darah O. Kemungkinan golongan darah anak mereka adalah ...',
    options: ['Semua AB', 'A dan B, masing-masing 50%', 'AB dan O, masing-masing 50%', 'Semua O'], answer: 1, explain: 'IAIB × ii menghasilkan 50% IAi (A) dan 50% IBi (B).' },
  { type: 'HITUNGAN', text: 'Dua orang bergolongan darah A heterozigot (IAi) menikah. Peluang anak mereka bergolongan darah O adalah ...',
    options: ['0%', '25%', '50%', '75%'], answer: 1, explain: 'IAi × IAi menghasilkan IAIA : IAi : IAi : ii, sehingga ii = 1/4 = 25%.' },
  { type: 'HITUNGAN', text: 'Ibu bergolongan darah O memiliki anak bergolongan darah B. Golongan darah ayah yang mungkin adalah ...',
    options: ['A atau O', 'B atau AB', 'A atau AB', 'Hanya O'], answer: 1, explain: 'Anak IBi menerima i dari ibu, sehingga IB berasal dari ayah. Ayah bergolongan B atau AB.' },
  { type: 'TEORI', text: 'Pada kelinci, urutan dominansi alel warna bulu adalah C (agouti), cch (chinchilla), ch (himalaya), c (albino). Urutan dominansinya adalah ...',
    options: ['c > ch > cch > C', 'C > cch > ch > c', 'cch > C > c > ch', 'ch > c > C > cch'], answer: 1, explain: 'C dominan terhadap semua alel lain, diikuti cch, ch, dan paling resesif c.' },
  { type: 'TEORI', text: 'Kelinci bergenotipe chc akan berfenotipe ...',
    options: ['Agouti', 'Chinchilla', 'Himalaya', 'Albino'], answer: 2, explain: 'Alel ch dominan terhadap c, sehingga fenotipenya himalaya.' },
  { type: 'TEORI', text: 'Gen letal adalah gen yang ...',
    options: ['Mengatur dua sifat sekaligus', 'Menyebabkan kematian individu pembawanya pada kondisi genotipe tertentu', 'Hanya terdapat pada kromosom kelamin', 'Menutupi ekspresi gen lain'], answer: 1, explain: 'Gen letal menyebabkan kematian, biasanya pada kondisi homozigot, sebelum atau sesudah lahir.' },
  { type: 'HITUNGAN', text: 'Tikus kuning (Yy) disilangkan dengan sesamanya; YY letal. Dari 60 anak tikus yang hidup, perkiraan jumlah tikus berbulu kuning adalah ...',
    options: ['20', '30', '40', '45'], answer: 2, explain: 'Keturunan hidup berasal dari 2 Yy (kuning) : 1 yy. Kuning = 2/3 × 60 = 40.' },
  { type: 'HITUNGAN', text: 'Persilangan ayam creeper (Crcr) dengan sesamanya menghasilkan CrCr yang letal pada masa embrio. Persentase embrio yang mati adalah ...',
    options: ['0%', '25%', '50%', '75%'], answer: 1, explain: 'Crcr × Crcr menghasilkan CrCr : Crcr : crcr = 1 : 2 : 1, sehingga CrCr yang mati = 25%.' },
  { type: 'TEORI', text: 'Perbedaan kodominansi dengan dominansi tidak sempurna adalah ...',
    options: ['Kodominansi menghasilkan sifat campuran baru', 'Pada kodominansi kedua sifat alel tampak utuh bersamaan, pada dominansi tidak sempurna sifatnya intermediet', 'Dominansi tidak sempurna terjadi pada gen letal', 'Tidak ada perbedaan'], answer: 1, explain: 'Kodominansi: kedua sifat tampak utuh. Dominansi tidak sempurna: sifat heterozigot berada di antara kedua induk.' }
];

export const QUESTION_SETS: Record<number, Question[]> = { 1: QUESTIONS, 2: QUESTIONS_L2 };
