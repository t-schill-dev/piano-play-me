/*
 * Song lists for "Play a Song": a level (easy / challenging / hard) and a language (English / German).
 * Each list holds up to six song ids from SONGS. Lists were agreed with the grown-up before use.
 */
export type Level = 'easy' | 'challenging' | 'hard';
export type Lang = 'en' | 'de';

export const LEVELS: { id: Level; title: string; emoji: string; hint: string }[] = [
  { id: 'easy', title: 'Easy', emoji: '🌱', hint: 'Short songs with simple notes' },
  { id: 'challenging', title: 'Challenging', emoji: '🌿', hint: 'A few more notes to find' },
  { id: 'hard', title: 'Hard', emoji: '🌳', hint: 'Longer songs and more keys' },
];

export const LANGS: { id: Lang; title: string; emoji: string }[] = [
  { id: 'en', title: 'English', emoji: '🇬🇧' },
  { id: 'de', title: 'Deutsch', emoji: '🇩🇪' },
];

/** Songs still to be added to the app are left out until their notes are checked. */
export const LISTS: Record<Level, Record<Lang, string[]>> = {
  easy: {
    en: ['buns', 'mary', 'twinkle', 'ode', 'hickory', 'weasel'],
    de: ['entchen', 'haenschen', 'weihnachts', 'summ', 'kuckuck', 'backe'],
  },
  challenging: {
    en: ['bridge', 'row', 'jacques', 'jingle', 'bingo'],
    de: ['jacques', 'fuchs', 'voegel', 'maennlein', 'vogel', 'oma'],
  },
  hard: {
    en: ['shenandoah'],
    de: ['stille', 'tannenbaum', 'kinderlein', 'mond', 'sternlein', 'gedanken'],
  },
};

const isLevel = (v: string | undefined): v is Level => LEVELS.some((l) => l.id === v);
const isLang = (v: string | undefined): v is Lang => LANGS.some((l) => l.id === v);
export const asLevel = (v: string | undefined): Level | undefined => (isLevel(v) ? v : undefined);
export const asLang = (v: string | undefined): Lang | undefined => (isLang(v) ? v : undefined);

/** The last song list the child opened, so the back arrow on a song returns to it. */
let lastSongs = 'songs';
export const lastSongsPath = (): string => lastSongs;
export const rememberSongs = (path: string): void => { lastSongs = path; };
