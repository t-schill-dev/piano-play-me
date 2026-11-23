import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { useSongs, type Song } from './lib/songs'

// Safari before 14.1 (for example an iPad stuck on iOS 12) ignores `gap` in
// flex layouts. Detect that so app.css can space things with margins instead.
function flexGapWorks(): boolean {
  const d = document.createElement('div')
  d.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute'
  d.appendChild(document.createElement('div'))
  d.appendChild(document.createElement('div'))
  document.body.appendChild(d)
  const ok = d.scrollHeight === 1
  d.remove()
  return ok
}
function setAppHeight(): void {
  document.documentElement.style.setProperty('--app-h', window.innerHeight + 'px')
}
setAppHeight()
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 300))

if (!flexGapWorks()) document.documentElement.classList.add('no-flex-gap')

// Songs saved online win over the built-in ones. If the server is slow or the iPad is
// offline, start after 3 seconds with the built-in songs.
async function loadSongs(): Promise<void> {
  try {
    const res = await Promise.race([
      fetch('/api/songs'),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    if (!res.ok) return
    const body = (await res.json()) as { songs?: Song[] | null }
    if (Array.isArray(body.songs) && body.songs.length) useSongs(body.songs)
  } catch { /* use the built-in songs */ }
}

loadSongs().then(() => mount(App, { target: document.getElementById('app')! }))
