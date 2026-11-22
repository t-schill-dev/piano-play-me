# piano-play-me
App to learn playing simple songs on the piano with visual guidance


# Piano Listener (prototype)

Plain HTML/JS, no build step, no backend. Files: `index.html`, `app.js`, `pitch.js`.

## Put it online (Cloudflare Pages, about 3 minutes)
Safari only allows the microphone on an `https://` page, so it needs to be hosted.

1. Download this `piano-mic` folder to your Mac.
2. Go to dash.cloudflare.com → Workers & Pages → Create → Pages → "Upload assets".
3. Name the project (for example `piano-listener`), then drag the `piano-mic` folder in and click Deploy.
4. Open the `https://piano-listener.pages.dev` link on the iPad in Safari. Tip: Share → Add to Home Screen.

To update later: same project → Create deployment → drag the folder again.

## What to test
- Quiet room, iPad speaker volume down, iPad on the music stand.
- Tap **Start listening**, then **Allow** the microphone.
- "Just play": play each key from low C to high C slowly, one key at a time. Watch whether the right key lights up and stays steady.
- Try soft and loud presses, and the same key twice in a row.
- "Find the key": the glowing key is the target. A right note shows "Yes!" and a star; a wrong one gets a kind nudge.
- Grown-up corner: Raw note should match right away; Steady note should not flicker. Adjust the three sliders if needed and note which settings work best.

## How it works
- Pitch: McLeod Pitch Method (normalized autocorrelation) on 2048-sample frames, ~60 times a second.
- Steadiness: a note must repeat for N frames (default 4, about 65 ms) and pass a confidence threshold (default 85%) before the key lights.
- New key presses are detected from a jump in loudness, so playing the same key twice counts twice.
- Right letter in a different octave counts as correct in "Find the key", with a note saying so.
- **Stop listening** turns the microphone off (the iPad's mic indicator goes away). Tap Start to listen again.
- **Piano only** (on by default, in the grown-up corner): a note only counts if it starts with a sharp key strike, is loudest right at the start, and its pitch stays steady for the first ~130 ms. Talking and singing slide or wobble in pitch, so they are ignored. Someone humming one perfectly steady note can still get through. If real piano notes are being ignored, raise "Pitch wobble allowed".

## Deploys
`netlify.toml` publishes the repo root and only deploys `main`; pull requests and other branches are skipped.
