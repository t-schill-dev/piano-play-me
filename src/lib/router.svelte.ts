/* Tiny hash router: #/, #/discover, #/songs, #/play/<song>, #/adventure, #/journey/<song>, #/lesson/<song>/<n> */
export interface Route { name: string; params: string[]; }

function parse(): Route {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || 'home', params: parts.slice(1) };
}

class Router {
  route = $state<Route>(parse());
  constructor() {
    window.addEventListener('hashchange', () => { this.route = parse(); window.scrollTo(0, 0); });
  }
  go(path: string): void {
    const h = '#/' + path.replace(/^\//, '');
    if (location.hash === h) this.route = parse();
    else location.hash = h;
  }
}

export const router = new Router();
