/*
 * Song library + Adventure stories. All melodies are traditional / public domain.
 * Notation: space-separated notes, "|" between phrases. A note is a letter (octave 4 by
 * default) or letter+octave ("C5", "G3"), with an optional ":beats" (default 1).
 */
export interface Note { midi: number; beats: number; }

export interface Song {
  id: string; title: string; emoji: string; bpm: number; notes: string;
  place: string; friend: string; intro: string; done: string;
  /** English title, when it differs from the main title. Shown in the English song list. */
  titleEn?: string;
}

export interface Lesson {
  kind: 'notes' | 'part' | 'whole';
  title: string; icon: string; say: string;
  notes: Note[];
  /** Indexes where a new row of note bubbles starts. */
  breaks: number[];
}

const LETTERS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The song's title in the chosen language. English uses titleEn when there is one. */
export function titleIn(song: Song, lang?: 'en' | 'de'): string {
  return lang === 'en' && song.titleEn ? song.titleEn : song.title;
}

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
    id: 'jacques', title: 'Bruder Jakob', titleEn: 'Brother John', emoji: '🔔', bpm: 104,
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
    id: 'stille', title: 'Stille Nacht', emoji: '🕯️', bpm: 96,
    notes: 'D:1.5 E:0.5 D B3:3 | D:1.5 E:0.5 D B3:3 | A:2 A F#:3 | G:2 G D:3 | E:2 E G:1.5 F#:0.5 E | D:1.5 E:0.5 D B3:3 | E:2 E G:1.5 F#:0.5 E | D:1.5 E:0.5 D B3:3 | A:2 A C5:1.5 A:0.5 F# | G:3 B:3 | G:1.5 D:0.5 B3 D:1.5 C:0.5 A3 | G3:6',
    place: 'Winter Village', friend: 'the Village',
    intro: 'It is a quiet winter night in the village, and everyone would love a calm song. This one has a black key in it: F sharp. Pip will show you where it is.',
    done: 'The candles glow and the whole village listens. What a peaceful song you played.'
  },
  // More German songs. Notes written from memory: check by ear.
  { id: 'weihnachts', title: 'Morgen kommt der Weihnachtsmann', emoji: '🎅', bpm: 100,
    notes: 'C C G G A A G:2 F F E E D:2 C:2 | G G F F E E D:2 G G F F E E D:2 | C C G G A A G:2 F F E E D:2 C:2',
    place: 'Toy Workshop', friend: 'the Elves',
    intro: 'The elves in the Toy Workshop are wrapping presents. They need a song to know Santa is coming tomorrow.',
    done: 'Tomorrow is almost here! The presents are wrapped and the elves cheer. Thank you, music maker!' },
  { id: 'summ', title: 'Summ, summ, summ', emoji: '🐝', bpm: 104,
    notes: 'D4:2 C4:2 B3:4 A3 B3 C4 A3 G3:4 | B3 C4 D4 B3 A3 B3 C4 A3 B3 C4 D4 B3 A3 B3 C4 A3 | D4:2 C4:2 B3:4 A3 B3 C4 A3 G3:4',
    place: 'Flower Meadow', friend: 'the Bee',
    intro: 'The little bee is lost in Flower Meadow. Her buzzing song will help her find the flowers.',
    done: 'Summ, summ, summ! The bee flies home over the flowers. What a buzzy song!' },
  { id: 'kuckuck', title: "Kuckuck, Kuckuck, ruft's aus dem Wald", emoji: '🐦', bpm: 96,
    notes: 'G E:2 G E:2 D C D C:3 D D E F:2 D | E E F G:2 E G:2 E G:2 E F E D C:3',
    place: 'Cuckoo Wood', friend: 'the Cuckoo',
    intro: 'The cuckoo in Cuckoo Wood has forgotten how to call. Can you play his song so he remembers?',
    done: 'Cuckoo, cuckoo! The bird calls out from the trees, loud and clear.' },
  { id: 'backe', title: 'Backe, backe Kuchen', emoji: '🎂', bpm: 100,
    notes: 'G G A A G:2 E E G G A A G:2 E:2 | G G A A G G E E G G A A G G E E | G:0.5 G:0.5 G:1 E:2 G:0.5 G:0.5 G:1 E:2 G G E:2 G G A A | G G E:2 C:2 G E D D C:2',
    place: 'Warm Oven Street', friend: 'the Baker',
    intro: 'The baker is making a cake, and the oven needs a rhythm to bake it just right.',
    done: 'The cake is golden and warm. Everyone gets a slice, and the baker says thank you!' },
  { id: 'fuchs', title: 'Fuchs, du hast die Gans gestohlen', emoji: '🦊', bpm: 96,
    notes: 'G G A G F E D:2 | C C D E F E D:2 | G G A G F E D:2 | C D E D C:4',
    place: 'Goose Farm', friend: 'the Fox',
    intro: 'A sly fox sneaked into Goose Farm. The geese want their song back, so play it loudly!',
    done: 'The fox runs away and the geese honk happily. Everyone is safe again.' },
  { id: 'voegel', title: 'Alle Vögel sind schon da', emoji: '🐥', bpm: 104,
    notes: 'E E F G G F E D | C C D E E D D:2 | E E F G G F E D | C C D E D C C:2',
    place: "Birds' Garden", friend: 'the Birds',
    intro: 'All the birds have come to the garden, but one is still missing. Let us sing to call them back.',
    done: 'All the birds are here, singing and flapping their wings. What a happy garden!' },
  { id: 'maennlein', title: 'Ein Männlein steht im Walde', emoji: '🍄', bpm: 100,
    notes: 'C D E F G:2 | G A G F E:2 | C D E F G:2 | G A G F E:2 | C:4',
    place: 'Forest Clearing', friend: 'the Little Man',
    intro: 'A little man stands very still in the forest clearing. Will you play his song so he can wave hello?',
    done: 'The little man waves and smiles at you. He is happy to have a new friend.' },
  { id: 'vogel', title: 'Kommt ein Vogel geflogen', emoji: '🕊️', bpm: 100,
    notes: 'G G A G F E D:2 | C C D E D C:2 | G G A G F E D:2 | C E G:4',
    place: 'Bird Hill', friend: 'the Bird',
    intro: 'A bird flies up to Bird Hill with a message. Play its song so it can deliver the message.',
    done: 'The bird sings its message, and everyone on the hill smiles. Flap, flap, goodbye!' },
  { id: 'oma', title: 'Meine Oma fährt im Hühnerstall Motorrad', emoji: '🛵', bpm: 116,
    notes: 'G G G A G:2 | C C C D C:2 | G G G A G:2 | E D C:4',
    place: 'Chicken Farm', friend: 'Grandma',
    intro: 'Grandma is riding her motorbike through the chicken house! Play her song so she can slow down.',
    done: 'Brrrm! Grandma waves from her motorbike and the chickens cluck along. What a ride!' },
  { id: 'tannenbaum', title: 'O Tannenbaum', emoji: '🎄', bpm: 92,
    notes: 'C F F F A G:2 | C F F F A G:2 | C D E F G:2 | A G F E D:2 | C:4',
    place: 'Christmas Hill', friend: 'the Little Tree',
    intro: 'The little fir tree on Christmas Hill wants to sparkle, but it needs a song to shine.',
    done: 'The tree glows with lights and stars. Oh, what a beautiful tree!' },
  { id: 'kinderlein', title: 'Ihr Kinderlein, kommet', emoji: '🍬', bpm: 96,
    notes: 'G G:2 E G G:2 E G F:2 D F E:3 | E D:2 D D F:2 F F E:2 E E A:3 | A G:2 G G C:2 G E G:2 F D C:3',
    place: 'Candy Cottage', friend: 'the Children',
    intro: 'The children are waiting at Candy Cottage. Play their song and they will come in to see the sweets.',
    done: 'The children come in, and they all smile at the sweet treats. What a warm welcome!' },
  { id: 'mond', title: 'Der Mond ist aufgegangen', emoji: '🌕', bpm: 92,
    notes: 'C D E F G:2 | A G F E D:2 | C D E F G:2 | A G F E D C:4',
    place: 'Moonrise Hill', friend: 'the Moon',
    intro: 'The moon has just risen over Moonrise Hill. It likes to hear a calm song before bedtime.',
    done: 'The moon glows softly over the hill, and the whole sky feels calm. Good night, moon.' },
  { id: 'sternlein', title: 'Weißt du, wieviel Sternlein stehen', emoji: '✨', bpm: 92,
    notes: 'C C G G A A G:2 | F F E E D D C:2 | G G F F E E D:2 | G G F F E E D:2 | C C G G A A G:2 | F F E E D D C:2',
    place: 'Night Sky Park', friend: 'the Stars',
    intro: 'The stars in Night Sky Park are hard to count tonight. Play their song and let them shine.',
    done: 'The stars twinkle all over the park. How many can you see now?' },
  { id: 'gedanken', title: 'Die Gedanken sind frei', emoji: '🌾', bpm: 96,
    notes: 'C D E F G:2 | E D C D E:2 | G G A G F E D:2 | C:4',
    place: 'Free Field', friend: 'the Thoughts',
    intro: 'The thoughts in Free Field want to fly high. Play their song and let them go wherever they like.',
    done: 'The thoughts fly free over the field. You can think whatever you like, always!' },
  // Old MacDonald and Happy Birthday for the English lists. Old MacDonald's notes come from a
  // note list the grown-up provided; Happy Birthday's notes are from memory. Check both by ear.
  { id: 'macdonald', title: 'Old MacDonald Had a Farm', emoji: '🐷', bpm: 100,
    notes: 'G G G D E E D:2 | B B A A G:3 | D G G G D E E D:2 | B B A A G:4 | D:0.5 D:0.5 G G G D:0.5 D:0.5 G G G:2 | G:0.5 G:0.5 G G:0.5 G:0.5 G G:0.5 G:0.5 G:0.5 G:0.5 G G | G G G D E E D:2 | B B A A G:4',
    place: 'Old Farm Gate', friend: 'the Farmer',
    intro: 'Old MacDonald needs help with his farm. Every animal wants to make its sound, so play his song for them.',
    done: 'E-I-E-I-O! Every animal on the farm makes its sound. What a noisy, happy farm!' },
  { id: 'birthday', title: 'Happy Birthday', emoji: '🥳', bpm: 100,
    notes: 'G:0.75 G:0.25 A G C5 B:2 | G:0.75 G:0.25 A G D C5:2 | G:0.75 G:0.25 G E C5 B A:2 | F:0.75 F:0.25 E C5 D C5:2',
    place: 'Party Hall', friend: 'the Party Friends',
    intro: 'Everyone is getting ready for a birthday party in the Party Hall. Play the birthday song to start it.',
    done: 'Hooray! The party has started, and everyone sings along. Happy birthday to you!' },
  // Four more English songs. Notes from the grown-up's note lists. Notes above the keyboard were moved down an octave.
    { id: 'saints', title: 'When the Saints Go Marching In', emoji: '🎺', bpm: 108,
    notes: 'C E F G:5 | C E F G:5 | C E F G:2 E:2 C:2 E:2 D:5 | E E D C:3 C E:2 G:2 G F:5 | E F G:2 E:2 C:2 D:2 C:4',
    place: 'Parade Street', friend: 'the Marching Band',
    intro: 'The marching band on Parade Street is ready to go, but they need a song to start the parade.',
    done: 'The band marches down the street, playing loud and proud. What a parade!' },
  { id: 'yankee', title: 'Yankee Doodle', emoji: '🎩', bpm: 110,
    notes: 'C:0.5 C:0.5 D:0.5 E:0.5 C:0.5 E:0.5 D | C:0.5 C:0.5 D:0.5 E:0.5 C B3 | C:0.5 C:0.5 D:0.5 E:0.5 F:0.5 E:0.5 D:0.5 C:0.5 | B3:0.5 G3:0.5 A3:0.5 B3:0.5 C C | A3:0.75 B3:0.25 A3:0.5 G3:0.5 A3:0.5 B3:0.5 C | G3:0.75 A3:0.25 G3:0.5 F3:0.5 E3 G3 | A3:0.75 B3:0.25 A3:0.5 G3:0.5 A3:0.5 B3:0.5 C:0.5 A3:0.5 | G3:0.5 C:0.5 B3:0.5 D:0.5 C C',
    place: 'Fair Grounds', friend: 'the Drummer',
    intro: 'The drummer at the Fair Grounds is waiting for a tune to keep the beat.',
    done: 'Rat-a-tat-tat! The drummer keeps time and everyone cheers. Yankee Doodle!' },
  { id: 'wishyou', title: 'We Wish You a Merry Christmas', emoji: '🎁', bpm: 96,
    notes: 'G3 C C:0.5 D:0.5 C:0.5 B3:0.5 A3 A3 | A3 D D:0.5 E:0.5 D:0.5 C:0.5 B3 G3 | G3 E E:0.5 F:0.5 E:0.5 D:0.5 C A3 | G3:0.5 G3:0.5 A3 D B3 C:2',
    place: 'Snowy Square', friend: 'the Carolers',
    intro: 'The carolers in Snowy Square are going door to door, and they want your song to sing along.',
    done: 'The carolers finish with a big cheer. Merry Christmas to everyone!' },
  { id: 'grace', title: 'Amazing Grace', emoji: '🕊️', bpm: 76,
    notes: 'D G:2 B:0.5 G:0.5 B:2 A G:2 E D:2 | D G:2 B:0.5 G:0.5 B:2 A D:3 | B D:1.5 B:0.5 D:0.5 B:0.5 G:2 D E:1.5 G:0.5 G:0.5 E:0.5 D:2 | D G:2 B:0.5 G:0.5 B:2 A G:3',
    place: 'Quiet Chapel', friend: 'the Choir',
    intro: 'The choir in the Quiet Chapel is singing softly. Will you play the song for them?',
    done: 'The chapel is calm and bright. The choir thanks you for the gentle song.' },
  // English songs (traditional / public domain). Notes written from memory: check by ear.
  {
    id: 'hickory', title: 'Hickory Dickory Dock', emoji: '🐭', bpm: 100,
    notes: 'E D C D E E E | D D D | E G G | E D C D E E E | D D E D C:4',
    place: 'Clock Tower', friend: 'the Little Mouse',
    intro: 'A little mouse ran up the clock tower and can not find the way down. Your song will help it climb back down.',
    done: 'Tick, tock! The mouse hops safely down the clock tower and waves goodbye.'
  },
  {
    id: 'weasel', title: 'Pop Goes the Weasel', emoji: '🐒', bpm: 104,
    notes: 'E E G E D | E G G | A G E G | C D C | E E G E D | E G G | A G E D C:2',
    place: 'Market Street', friend: 'the Monkey',
    intro: 'The monkey on Market Street is up to something silly. Can you play his tune so the fun can start?',
    done: 'Pop! The monkey laughs and everyone on Market Street claps along.'
  },
  {
    id: 'bingo', title: 'Bingo', emoji: '🐄', bpm: 100,
    notes: 'G G D E D | G G D E D | G G G E F F E | D C D E D:2',
    place: 'Farmyard', friend: 'the Farmer',
    intro: 'The farmer lost his favourite tune in the farmyard. Can you help him find it again?',
    done: 'The farmer sings along and the animals all moo, baa and cluck with joy.'
  },
  {
    id: 'shenandoah', title: 'Shenandoah', emoji: '⛵', bpm: 88,
    notes: 'C E G E D | C E G E D:2 | C E G E D C:2 | G A G E D:2',
    place: 'River Bend', friend: 'the Riverboat Captain',
    intro: 'The riverboat captain is missing his song, and the boat can not leave the river bend without it.',
    done: 'The captain smiles, the boat sails off down the river, and your song goes with it.'
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
