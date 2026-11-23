# Piano Play

A web app that helps a child learn simple songs on a real acoustic piano. The iPad listens through its microphone, so there's no MIDI and nothing to install. Built with Svelte 5, Vite and TypeScript. Songs and progress are saved online in Netlify Blobs through a small Netlify function, so they are shared between devices.

## Modes
- **Discover**: "Just play" lights up whatever key you play. "Find the key" makes one key glow and cheers when you find it.
- **Play a Song**: pick one of 12 public-domain songs, including German children's songs (Alle meine Entchen, Hänschen klein, Bruder Jakob, Guten Abend gut' Nacht, Stille Nacht). Coloured note bubbles show the tune, the next key glows, and the app waits for the right note. "Listen first" plays the tune (the mic ignores it while it plays).
- **Adventure**: Pip the piano mouse helps friends who need songs. Each place has 4–5 lessons. You meet the notes, learn the song in parts (each part played twice), then play the whole song. Lessons earn 1–3 stars and unlock one after another. Finishing a place opens the next one and adds a 🏅 to that song.

Every screen fits the iPad without scrolling: the piano takes whatever space is left, and long songs show two rows of notes at a time.

Feedback is always gentle. Wrong notes get a kind nudge, the right letter in another octave counts, and finishing a lesson always earns at least one star.

## Develop
```bash
npm install
npm run dev      # local dev server
npm run check    # type check
npm run build    # production build into dist/
```
The microphone only works on `https://` or `localhost`.

## Code map
- `src/lib/pitch.ts`: pitch detection (McLeod pitch method), note names and colours.
- `src/lib/listener.svelte.ts`: microphone → steady notes. It includes the "piano only" filter: a note counts only if it starts with a sharp strike, is loudest at the start, and has a steady pitch, so talking and singing are ignored.
- `src/lib/songs.ts`: the song library, the Adventure stories, the lesson builder and the star rules.
- `src/lib/progress.svelte.ts`: Adventure progress, saved in localStorage.
- `src/lib/synth.ts`: the small synth behind "Listen first".
- `src/components/NoteRunner.svelte`: the play-along engine shared by songs and lessons.
- `src/pages/*`: Home, Discover, the song list and player, the Adventure map, a place's lessons, and a single lesson.

## Saved data (Netlify Blobs)
`netlify/functions/api.mts` serves `/api/songs`, `/api/family` and `/api/progress` from the Blobs store `piano-play`. The logic is in `netlify/lib/api-core.mts`.
- **Family login and players:** the app opens on "Who's playing?". The family code (at least 6 characters) is the login, and a grown-up types it once per device. Inside a family, players work like profiles: each has a name and an animal avatar, and their own stars. Add players with the ＋ tile, and rename or remove them under ⚙️ (removing a player deletes their stars). Up to 8 players.
- **Guest** is always on the picker when nobody is logged in. Guest starts fresh and is never saved. Once a family is logged in, Guest is hidden unless a grown-up turns on "Show Guest" under ⚙️.
- **Header:** tap "🎹 Piano Play" to go home. "Log out" (top right, only when logged in) forgets the code on this device and goes back to the Guest screen.
- **Protecting stars:** while nobody is logged in, ⚙️ has nothing to change or erase. While logged in, changing players, the Guest setting or stars needs the family code typed again under ⚙️ ("Unlock changes").
- The server stores a family's players and stars under a SHA-256 hash of the code, and keeps the best stars when two devices save. The device only remembers the code. Stars that older versions kept on the device move to the first player created.
- **Songs:** the first request copies the built-in songs into the store. After that the stored list is used, and any new built-in songs are added to it. To replace the list, set `SONGS_ADMIN_KEY` in Netlify's environment variables and send `PUT /api/songs` with header `x-admin-key` and body `{"songs": [...]}`. If the server can't be reached, the app uses the built-in songs.
- **Offline:** stars earned offline are saved when the connection comes back.

## Adding a song
Add an entry to `SONGS` in `src/lib/songs.ts`. Notes are letters (octave 4 by default, or `C5`, `G3`), with an optional `:beats` (default 1). Separate phrases with `|`. Lessons are generated from the phrases automatically.

## Grown-up corner
Tap ⚙️ at the top of any screen to open a live accuracy readout (frequency, note, cents, confidence) and sliders for sensitivity. It also has buttons to open all Adventure places or reset progress.

## Deploys
`netlify.toml` builds with `npm run build` and publishes `dist/`. It deploys `main` only, so pull requests and other branches are skipped.
