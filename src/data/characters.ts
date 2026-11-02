import type { CharacterId } from '../types';

export interface CharacterData {
  id: CharacterId;
  name: string;
  role: string;
  desc: string;
  portrait: string;
  stats: { label: string; value: number }[];
}

export const CHARACTERS: CharacterData[] = [
  {
    id: 'arka', name: 'ARKA', role: 'GENETIC STRIKER',
    desc: 'Petarung agresif dengan serangan kuat dan critical damage tinggi.',
    portrait: 'characters/arka.png',
    stats: [{ label: 'SERANG', value: 92 }, { label: 'BERTAHAN', value: 55 }, { label: 'CRITICAL', value: 88 }]
  },
  {
    id: 'nara', name: 'NARA', role: 'GENETIC GUARDIAN',
    desc: 'Petarung tangguh dengan pertahanan kuat dan kemampuan melindungi diri.',
    portrait: 'characters/nara.png',
    stats: [{ label: 'SERANG', value: 60 }, { label: 'BERTAHAN', value: 94 }, { label: 'CRITICAL', value: 50 }]
  }
];
export const CHARACTER_MAP: Record<CharacterId, CharacterData> = { arka: CHARACTERS[0], nara: CHARACTERS[1] };

export const NARRATION: string[] = [
  'Di suatu tempat yang jauh dari dunia manusia, tersembunyi sebuah kerajaan bernama Mendelian.',
  'Kerajaan ini dibangun di atas keseimbangan kehidupan. Setiap makhluk mewarisi sifat dari induknya melalui pola yang teratur. Warna bunga, bentuk biji, hingga ciri-ciri keturunan mengikuti hukum pewarisan yang telah menjaga dunia ini selama berabad-abad.',
  'Namun, kedamaian itu telah berakhir.',
  'Sebuah kekuatan misterius yang dikenal sebagai Chaos Mutation muncul dari balik kegelapan. Kekuatan tersebut merusak keseimbangan genetika, mengacaukan pewarisan sifat, dan mengubah makhluk-makhluk yang dahulu damai menjadi monster buas.',
  'Kini, lembah yang dahulu dipenuhi kehidupan telah berubah menjadi wilayah berbahaya.',
  'Dan tanpa mengetahui alasannya, seorang pelajar dari Kalimantan Tengah telah tiba di dunia ini.',
  'Sebuah petualangan besar baru saja dimulai.'
];
