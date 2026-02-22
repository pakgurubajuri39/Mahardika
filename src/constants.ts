import { CharacterType, RegionGroup, Property } from './types';

export const BOARD_SIZE = 24;

export const INITIAL_PROPERTIES: Property[] = [
  // Start
  { id: 'go', name: 'Gerbang Utama (GO)', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  
  // Sumatera (Hijau)
  { id: 'sriwijaya', name: 'Sriwijaya', group: RegionGroup.SUMATERA, price: 60, rent: 2, ownerId: null, isMortgaged: false },
  { id: 'samudera_pasai', name: 'Samudera Pasai', group: RegionGroup.SUMATERA, price: 100, rent: 6, ownerId: null, isMortgaged: false },
  { id: 'pagaruyung', name: 'Pagaruyung', group: RegionGroup.SUMATERA, price: 120, rent: 8, ownerId: null, isMortgaged: false },
  
  // Transport 1
  { id: 'selat_malaka', name: 'Dermaga Selat Malaka', group: RegionGroup.TRANSPORT, price: 200, rent: 25, ownerId: null, isMortgaged: false },
  
  // Jawa (Merah)
  { id: 'majapahit', name: 'Majapahit', group: RegionGroup.JAWA, price: 200, rent: 16, ownerId: null, isMortgaged: false },
  { id: 'singasari', name: 'Singasari', group: RegionGroup.JAWA, price: 160, rent: 12, ownerId: null, isMortgaged: false },
  { id: 'pajajaran', name: 'Pajajaran', group: RegionGroup.JAWA, price: 140, rent: 10, ownerId: null, isMortgaged: false },
  
  // Special: Pengasingan
  { id: 'pengasingan', name: 'Petak Pengasingan', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  
  // Sulawesi (Kuning)
  { id: 'gowa', name: 'Gowa', group: RegionGroup.SULAWESI, price: 220, rent: 18, ownerId: null, isMortgaged: false },
  { id: 'tallo', name: 'Tallo', group: RegionGroup.SULAWESI, price: 240, rent: 20, ownerId: null, isMortgaged: false },
  { id: 'bone', name: 'Bone', group: RegionGroup.SULAWESI, price: 280, rent: 24, ownerId: null, isMortgaged: false },
  
  // Resource 1
  { id: 'cengkeh', name: 'Ladang Cengkeh', group: RegionGroup.RESOURCE, price: 150, rent: 0, ownerId: null, isMortgaged: false },
  
  // Maluku (Biru)
  { id: 'ternate', name: 'Ternate', group: RegionGroup.MALUKU, price: 350, rent: 35, ownerId: null, isMortgaged: false },
  { id: 'tidore', name: 'Tidore', group: RegionGroup.MALUKU, price: 400, rent: 50, ownerId: null, isMortgaged: false },
  
  // Transport 2
  { id: 'sunda_kelapa', name: 'Pelabuhan Sunda Kelapa', group: RegionGroup.TRANSPORT, price: 200, rent: 25, ownerId: null, isMortgaged: false },
  
  // Resource 2
  { id: 'pala', name: 'Perkebunan Pala', group: RegionGroup.RESOURCE, price: 150, rent: 0, ownerId: null, isMortgaged: false },
  
  // Fillers to reach 24 or adjust board logic
  { id: 'prasasti_1', name: 'Prasasti Kuno', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  { id: 'prasasti_2', name: 'Prasasti Kuno', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  { id: 'pajak_kerajaan', name: 'Pajak Kerajaan', group: RegionGroup.SPECIAL, price: 0, rent: 100, ownerId: null, isMortgaged: false },
  { id: 'dana_masyarakat', name: 'Dana Masyarakat', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  { id: 'kesaktian', name: 'Kotak Kesaktian', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  { id: 'perjalanan', name: 'Perjalanan Jauh', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
  { id: 'bebas_parkir', name: 'Istirahat di Pendopo', group: RegionGroup.SPECIAL, price: 0, rent: 0, ownerId: null, isMortgaged: false },
];

export const CHARACTER_DATA = {
  [CharacterType.GAJAH_MADA]: {
    description: 'Mahapatih: Diskon 20% saat membangun "Benteng Pertahanan".',
    sound: '/sounds/gajah_mada.mp3',
    avatar: 'https://picsum.photos/seed/gajahmada/100/100'
  },
  [CharacterType.MALAHAYATI]: {
    description: 'Laskar Inong Balee: Bebas biaya sewa jika berhenti di petak "Dermaga/Pelabuhan".',
    sound: '/sounds/malahayati.mp3',
    avatar: 'https://picsum.photos/seed/malahayati/100/100'
  },
  [CharacterType.TUNGGADEWI]: {
    description: 'Ratu: Mendapat tambahan 50 Kepeng setiap kali melewati petak GO.',
    sound: '/sounds/tunggadewi.mp3',
    avatar: 'https://picsum.photos/seed/tunggadewi/100/100'
  },
  [CharacterType.BAABULLAH]: {
    description: 'Penguasa 72 Pulau: Biaya menebus properti yang digadaikan lebih murah 50%.',
    sound: '/sounds/baabullah.mp3',
    avatar: 'https://picsum.photos/seed/baabullah/100/100'
  }
};
