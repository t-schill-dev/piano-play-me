import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

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
if (!flexGapWorks()) document.documentElement.classList.add('no-flex-gap')

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
