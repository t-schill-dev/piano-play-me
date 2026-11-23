/*
 * Song library + Adventure stories. All melodies are traditional / public domain.
 * Notation: space-separated notes, "|" between phrases. A note is a letter (octave 4 by
 * default) or letter+octave ("C5", "G3"), with an optional ":beats" (default 1).
 */
export interface Note { midi: number; beats: number; }

export interface Song {
  id: string; title: string; emoji: string; bpm: number; notes: string;
  place: string; friend: string; intro: string; done: string;
}

export interface Lesson {
  kind: 'notes' | 'part' | 'whole';
  title: string; icon: string; say: string;
  notes: Note[];
  /** Indexes where a new row of note bubbles starts. */
  breaks: number[];
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parse(text: string): Note[][] {
  return text.split('|').map((phrase) => phrase.trim().split(/\s+/).filter(Boolean).map((tok) => {
    const [name, beats] = tok.split(':');
    const m = /^([A-G])([#b]?)(\d)?$/.exec(name);
    if (!m) throw new Error('Bad note ' + tok);
    const octave = m[3] ? Number(m[3]) : 4;
    const midi = 12 * (octave + 1) + LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return { midi, beats: beats ? Number(beats) : 1 };
  }));
}

/** Ordered from easiest to hardest. The Adventure follows this order. */
export const SONGS: Song[] = [
  {
    id: 'buns', title: 'Hot Cross Buns', emoji: '🥐', bpm: 96,
    notes: 'E D C:2 | E D C:2 | C:0.5 C:0.5 C:0.5 C:0.5 D:0.5 D:0.5 D:0.5 D:0.5 | E D C:2',
    place: "Bea's Bakery", friend: 'Bea the Bear',
    intro: "Bea the Bear's oven only gets warm when someone plays a happy tune. Can you help Pip learn it?",
    done: 'The oven is warm and the buns smell yummy. Bea gives you a bun with a big smile!'
  },
  {
    id: 'mary', title: 'Mary Had a Little Lamb', emoji: '🐑', bpm: 100,
    notes: 'E D C D E E E:2 | D D D:2 E G G:2 | E D C D E E E E | D D E D C:4',
    place: 'Lamb Hill', friend: 'Little Lamb',
    intro: 'Little Lamb wandered a bit too far. If she hears her song, she can follow it home.',
    done: 'Little Lamb heard you and trotted all the way home. She is safe and cozy now.'
  },
  {
    id: 'twinkle', title: 'Twinkle Twinkle Little Star', emoji: '⭐', bpm: 92,
    notes: 'C C G G A A G:2 | F F E E D D C:2 | G G F F E E D:2 | G G F F E E D:2 | C C G G A A G:2 | F F E E D D C:2',
    place: 'Star Lake', friend: 'the Stars',
    intro: 'The stars over Star Lake forgot their song, so they shine very softly. Let\'s teach it back to them.',
    done: 'The stars remember their song and twinkle bright over the lake. Look how they sparkle!'
  },
  {
    id: 'ode', title: 'Ode to Joy', emoji: '🏰', bpm: 100,
    notes: 'E E F G G F E D | C C D E E:1.5 D:0.5 D:2 | E E F G G F E D | C C D E D:1.5 C:0.5 C:2',
    place: 'Joy Castle', friend: 'the Castle Friends',
    intro: 'The friends at Joy Castle are ready for a party, but the party needs a song. Will you play it?',
    done: 'The party starts and everyone dances in the big hall. Thank you, music maker!'
  },
  {
    id: 'jacques', title: 'Bruder Jakob (Frère Jacques)', emoji: '🔔', bpm: 104,
    notes: 'C D E C C D E C | E F G:2 E F G:2 | G:0.5 A:0.5 G:0.5 F:0.5 E C G:0.5 A:0.5 G:0.5 F:0.5 E C | C G3 C:2 C G3 C:2',
    place: 'Sleepy Tower', friend: 'Brother John',
    intro: 'Brother John is still asleep in Sleepy Tower. A gentle bell song will help him wake up.',
    done: 'Ding, dang, dong! Brother John wakes up, stretches, and waves hello.'
  },
  {
    id: 'bridge', title: 'London Bridge', emoji: '🌉', bpm: 104,
    notes: 'G:1.5 A:0.5 G F E F G:2 | D E F:2 E F G:2 | G:1.5 A:0.5 G F E F G:2 | D:2 G:2 E C:3',
    place: 'The Wobbly Bridge', friend: 'the Builders',
    intro: 'The builders fix the bridge best when music plays. Let\'s give them a song to work to.',
    done: 'The bridge is strong and steady now. Everyone can cross safely.'
  },
  {
    id: 'jingle', title: 'Jingle Bells', emoji: '🛷', bpm: 112,
    notes: 'E E E:2 E E E:2 E G C:1.5 D:0.5 E:4 | F F F:1.5 F:0.5 F E E E:0.5 E:0.5 E D D E D:2 G:2 | E E E:2 E E E:2 E G C:1.5 D:0.5 E:4 | F F F F F E E E:0.5 E:0.5 G G F D C:4',
    place: 'Snowy Woods', friend: 'the Sleigh',
    intro: 'The sleigh in Snowy Woods only moves when its bells have a song. Ready to make it go?',
    done: 'Jingle jingle! The sleigh glides through the snowy trees. What a fun ride!'
  },
  {
    id: 'row', title: 'Row, Row, Row Your Boat', emoji: '🚣', bpm: 96,
    notes: 'C:1.5 C:1.5 C D:0.5 E:1.5 | E D:0.5 E F:0.5 G:3 | C5:0.5 C5:0.5 C5:0.5 G:0.5 G:0.5 G:0.5 E:0.5 E:0.5 E:0.5 C:0.5 C:0.5 C:0.5 | G F:0.5 E D:0.5 C:3',
    place: 'Gentle River', friend: 'Pip',
    intro: 'Pip wants to row a little boat down Gentle River. A rowing song keeps the oars in time.',
    done: 'Pip rows all the way down the river, singing your song. What a lovely trip!'
  },
  // German children's songs (traditional / public domain).
  {
    id: 'entchen', title: 'Alle meine Entchen', emoji: '🦆', bpm: 104,
    notes: 'C D E F G:2 G:2 | A A A A G:4 | A A A A G:4 | F F F F E:2 E:2 | D D D D C:4',
    place: 'Duck Pond', friend: 'the Little Ducks',
    intro: 'The little ducks want to go for a swim, but they only jump in when they hear their song. Will you play it for them?',
    done: 'Splash! Heads in the water, tails up high. The little ducks are so happy!'
  },
  {
    id: 'haenschen', title: 'Hänschen klein', emoji: '🎒', bpm: 104,
    notes: 'G E E:2 F D D:2 | C D E F G G G:2 | G E E:2 F D D:2 | C E G G C:4 | D D D D D E F:2 | E E E E E F G:2 | G E E:2 F D D:2 | C E G G C:4',
    place: 'The Long Path', friend: 'Little Hans',
    intro: 'Little Hans walked off into the big wide world, and his mum misses him. If he hears his song, he will find the way home.',
    done: 'Hans hears his song and hurries home. His mum gives him the biggest hug!'
  },
  {
    id: 'abend', title: "Guten Abend, gut' Nacht", emoji: '🌙', bpm: 84,
    notes: 'E:0.5 E:0.5 G:3 E:0.5 E:0.5 G:3 | E:0.5 G:0.5 C5:2 B:1.5 A:0.5 A:2 G:2 | D:0.5 E:0.5 F:2 D D:0.5 E:0.5 F:3 | D:0.5 F:0.5 B:0.5 A:0.5 G:2 B:2 C5:4 | C:0.5 C:0.5 C5:3 A:0.5 F:0.5 G:3 | E:0.5 C:0.5 F G A G:3 | C:0.5 C:0.5 C5:3 A:0.5 F:0.5 G:3 | E:0.5 C:0.5 F E D C:4',
    place: 'Moonlight Meadow', friend: 'the Sleepy Bunnies',
    intro: 'The bunnies in Moonlight Meadow are tired, but they can not fall asleep. A soft goodnight song will help them.',
    done: 'The bunnies yawn, snuggle up and close their eyes. Sweet dreams, little bunnies.'
  },
  {
    id: 'stille', title: 'Stille Nacht', emoji: '🕯️', bpm: 96,
    notes: 'D:1.5 E:0.5 D B3:3 | D:1.5 E:0.5 D B3:3 | A:2 A F#:3 | G:2 G D:3 | E:2 E G:1.5 F#:0.5 E | D:1.5 E:0.5 D B3:3 | E:2 E G:1.5 F#:0.5 E | D:1.5 E:0.5 D B3:3 | A:2 A C5:1.5 A:0.5 F# | G:3 B:3 | G:1.5 D:0.5 B3 D:1.5 C:0.5 A3 | G3:6',
    place: 'Winter Village', friend: 'the Village',
    intro: 'It is a quiet winter night in the village, and everyone would love a calm song. This one has a black key in it: F sharp. Pip will show you where it is.',
    done: 'The candles glow and the whole village listens. What a peaceful song you played.'
  }
];

const parsed = new Map<string, Note[][]>();
/** Swap in the song list saved online (see /api/songs). The built-in list stays the fallback. */
export function useSongs(list: Song[]): void {
  SONGS.splice(0, SONGS.length, ...list);
  parsed.clear();
}
export function phrasesOf(song: Song): Note[][] {
  let p = parsed.get(song.id);
  if (!p) { p = parse(song.notes); parsed.set(song.id, p); }
  return p;
}
export const allNotes = (song: Song): Note[] => phrasesOf(song).flat();
export const songById = (id: string): Song | undefined => SONGS.find((s) => s.id === id);

/** Row starts for a list of phrases laid end to end. */
function breaksFor(phrases: Note[][]): number[] {
  const out: number[] = [];
  let i = 0;
  for (const p of phrases) { out.push(i); i += p.length; }
  return out;
}
export const songBreaks = (song: Song): number[] => breaksFor(phrasesOf(song));

/** 3-5 lessons per song: meet the notes, 1-3 song parts (each played twice), then the whole song. */
export function lessonsFor(song: Song): Lesson[] {
  const phrases = phrasesOf(song);
  const all = phrases.flat();
  const unique = Array.from(new Set(all.map((n) => n.midi))).sort((a, b) => a - b);
  const shuffled = unique.slice().sort(() => Math.random() - 0.5);
  const lessons: Lesson[] = [{
    kind: 'notes', title: 'Meet the notes', icon: '👋',
    say: `This song uses ${unique.length} notes. Let's find each one on the piano. Play the glowing key!`,
    notes: unique.concat(shuffled).map((midi) => ({ midi, beats: 1 })),
    breaks: [0, unique.length],
  }];
  const n = phrases.length;
  const groups = Math.min(3, Math.max(1, Math.ceil(n / 2)));
  const size = Math.ceil(n / groups);
  const NAMES = groups === 2 ? ['first', 'second'] : ['first', 'middle', 'last'];
  for (let g = 0; g < groups; g++) {
    const ph = phrases.slice(g * size, (g + 1) * size);
    if (!ph.length) continue;
    const part = ph.flat();
    const which = groups === 1 ? 'the' : 'the ' + NAMES[g];
    lessons.push({
      kind: 'part', title: 'Part ' + (g + 1), icon: '🎵',
      say: `Now let's learn ${which} part of the song. We'll play it two times.`,
      notes: part.concat(part),
      breaks: [0, part.length],
    });
  }
  lessons.push({
    kind: 'whole', title: 'The whole song', icon: '🌟',
    say: `You know all the parts! Now play the whole song for ${song.friend}.`,
    notes: all,
    breaks: breaksFor(phrases),
  });
  return lessons;
}

/** Number of lessons without building them (stable across calls). */
export function lessonCount(song: Song): number {
  const n = phrasesOf(song).length;
  const groups = Math.min(3, Math.max(1, Math.ceil(n / 2)));
  const size = Math.ceil(n / groups);
  let real = 0;
  for (let g = 0; g < groups; g++) if (g * size < n) real++;
  return real + 2;
}

/** Forgiving stars: finishing always earns at least one. */
export const starsFor = (misses: number): number => (misses <= 1 ? 3 : misses <= 4 ? 2 : 1);
