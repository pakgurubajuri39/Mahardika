export enum CharacterType {
  GAJAH_MADA = 'Gajah Mada',
  MALAHAYATI = 'Laksamana Malahayati',
  TUNGGADEWI = 'Tribhuwana Tunggadewi',
  BAABULLAH = 'Sultan Baabullah'
}

export enum RegionGroup {
  SUMATERA = 'Sumatera',
  JAWA = 'Jawa',
  SULAWESI = 'Sulawesi',
  MALUKU = 'Maluku',
  TRANSPORT = 'Transportasi',
  RESOURCE = 'Sumber Daya',
  SPECIAL = 'Spesial'
}

export interface Property {
  id: string;
  name: string;
  group: RegionGroup;
  price: number;
  rent: number;
  ownerId: string | null;
  isMortgaged: boolean;
  historyInfo?: string;
}

export interface Player {
  id: string;
  name: string;
  character: CharacterType;
  balance: number;
  position: number;
  properties: string[]; // property IDs
  isBankrupt: boolean;
  jailTurns: number;
  isAI?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  properties: Property[];
  logs: string[];
  isGameOver: boolean;
  winner: Player | null;
}

export interface Quiz {
  question: string;
  answer: string;
  options?: string[];
}
