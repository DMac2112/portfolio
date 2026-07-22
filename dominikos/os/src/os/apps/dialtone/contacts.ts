// contacts.ts — the fictional Dialtone roster. Every entry is an invented character (no real
// people; Dominik's own pinned card is the one exception, as a contact-form CTA). Presence is
// pure set dressing: EVERYONE is unreachable regardless of the dot. No trademarked names.

export type Presence = 'online' | 'away' | 'busy' | 'offline';

export interface Contact {
  id: string;
  name: string;
  tagline: string;
  presence: Presence;
  avatarSeed: number; // picks the monogram colour (deterministic)
  pinned?: boolean;   // Dominik's CTA card sorts to the top
}

export const PRESENCE_LABEL: Record<Presence, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
};

/** Roster order = pinned first, then as authored. */
export const CONTACTS: Contact[] = [
  { id: 'dominik', name: 'Dominik Machowiak', tagline: 'Probably coding. Leave a message!', presence: 'online', avatarSeed: 0, pinned: true },
  { id: 'paperclip', name: 'Helpful Paperclip', tagline: 'It looks like you’re trying to make a call…', presence: 'online', avatarSeed: 1 },
  { id: 'recruiter', name: 'The Recruiter', tagline: 'Just one quick question about your CV…', presence: 'online', avatarSeed: 2 },
  { id: 'mum', name: 'Mum', tagline: 'On the other line since 2004.', presence: 'busy', avatarSeed: 3 },
  { id: 'brick', name: 'Brick Phone (2003)', tagline: 'Battery: 1% since last Tuesday.', presence: 'online', avatarSeed: 4 },
  { id: 'modem', name: 'Dial-Up Modem', tagline: 'EEE-AWW-KSSSHHH…', presence: 'busy', avatarSeed: 5 },
  { id: 'support', name: 'Tech Support', tagline: 'Have you tried turning it off and on?', presence: 'away', avatarSeed: 6 },
  { id: 'sk8er', name: 'xX_sk8er_boi_Xx', tagline: 'brb mum needs the phone line', presence: 'online', avatarSeed: 7 },
  { id: 'goldfish', name: 'Office Goldfish', tagline: 'Will forget this call in 3 seconds.', presence: 'away', avatarSeed: 8 },
  { id: 'y2k', name: 'Y2K Bug', tagline: 'Still waiting for the year 2000.', presence: 'offline', avatarSeed: 9 },
  { id: 'printer', name: 'The Office Printer', tagline: 'PC LOAD LETTER.', presence: 'busy', avatarSeed: 10 },
  { id: 'maze', name: '3D Maze Screensaver', tagline: 'Lost in the maze again.', presence: 'away', avatarSeed: 11 },
  { id: 'lunch', name: 'Fridge Lunch Thief', tagline: 'It wasn’t me.', presence: 'online', avatarSeed: 12 },
];

export function contactById(id: string | null): Contact | undefined {
  return CONTACTS.find((c) => c.id === id);
}

/** Two-letter monogram from the display name ("Brick Phone (2003)" → "BP"). */
export function initials(name: string): string {
  const words = name.split(/[\s_]+/).map((w) => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean);
  const a = words[0]?.[0] ?? '?';
  const b = words[1]?.[0] ?? words[0]?.[1] ?? '';
  return (a + b).toUpperCase();
}

/** Original monogram palette (era-flavoured, ours). Seed indexes deterministically. */
const AVATAR_COLORS = [
  '#2f71cd', '#379437', '#b3542e', '#7a4fa0', '#1e8a8a', '#c02942',
  '#8a6d1a', '#4a5d8a', '#2e7d5b', '#a04a78', '#5b6c1e', '#386b9a', '#8a4a2e',
];

export function avatarColor(seed: number): string {
  return AVATAR_COLORS[((seed % AVATAR_COLORS.length) + AVATAR_COLORS.length) % AVATAR_COLORS.length];
}
