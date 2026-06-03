import { Player, Tournament, Payment } from './types';

export const INITIAL_PLAYERS: Player[] = [
  { id: 'p1', name: 'Akash (You)', isUser: true },
  { id: 'p2', name: 'Avi', isUser: false },
  { id: 'p3', name: 'Arpit', isUser: false },
  { id: 'p4', name: 'Archit', isUser: false }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const SUPPORTED_GAMES = [
  'Free Fire'
];
