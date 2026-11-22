/* Adventure progress, saved on this device (localStorage). Stars per lesson, per song. */
import { SONGS, lessonCount, type Song } from './songs';

const KEY = 'pianoPlay.progress.v1';

interface Saved { stars: Record<string, number[]>; openAll: boolean; }

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Saved>;
      return { stars: v.stars ?? {}, openAll: !!v.openAll };
    }
  } catch { /* private mode or blocked storage: start fresh */ }
  return { stars: {}, openAll: false };
}

class Progress {
  data = $state<Saved>(load());

  private save(): void {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  starsOf(songId: string, lesson: number): number {
    return this.data.stars[songId]?.[lesson] ?? 0;
  }

  record(songId: string, lesson: number, stars: number): void {
    const list = [...(this.data.stars[songId] ?? [])];
    list[lesson] = Math.max(list[lesson] ?? 0, stars);
    this.data.stars = { ...this.data.stars, [songId]: list };
    this.save();
  }

  songDone(song: Song): boolean {
    return this.starsOf(song.id, lessonCount(song) - 1) > 0;
  }

  songUnlocked(index: number): boolean {
    return index === 0 || this.data.openAll || this.songDone(SONGS[index - 1]);
  }

  lessonUnlocked(songId: string, lesson: number): boolean {
    return lesson === 0 || this.data.openAll || this.starsOf(songId, lesson - 1) > 0;
  }

  totalStars(): number {
    return Object.values(this.data.stars).flat().reduce((a, b) => a + (b || 0), 0);
  }

  openAll(): void { this.data.openAll = true; this.save(); }
  reset(): void { this.data = { stars: {}, openAll: false }; this.save(); }
}

export const progress = new Progress();
