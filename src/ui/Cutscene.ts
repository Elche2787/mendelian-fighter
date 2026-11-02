import { audio } from '../core/audio';

const cById = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemen #${id} tidak ditemukan`);
  return el as T;
};

/**
 * Pemutar cutscene video layar penuh. play() selesai (true) saat video habis atau dilewati,
 * dan false jika video gagal dimuat/diputar, sehingga pemanggil bisa memakai animasi cadangan.
 */
class Cutscene {
  private root = cById('cutscene');
  private video = cById<HTMLVideoElement>('cutscene-video');
  private skip = cById<HTMLButtonElement>('cutscene-skip');
  private current = '';
  private abortFn?: () => void;

  /** Memuat video lebih awal agar tidak ada jeda saat diputar. */
  preload(src: string): void {
    if (this.current === src) return;
    this.current = src;
    this.video.src = src;
    this.video.load();
  }

  play(src: string): Promise<boolean> {
    this.abort();
    this.preload(src);
    return new Promise<boolean>((resolve) => {
      let done = false;
      let loadTimer = 0;
      const finish = (ok: boolean): void => {
        if (done) return;
        done = true;
        window.clearTimeout(loadTimer);
        this.video.removeEventListener('ended', onEnd);
        this.video.removeEventListener('error', onErr);
        this.skip.removeEventListener('click', onSkip);
        window.removeEventListener('keydown', onKey);
        this.abortFn = undefined;
        this.root.classList.remove('show');                 // memudar menutup
        window.setTimeout(() => { this.root.hidden = true; this.video.pause(); resolve(ok); }, 360);
      };
      const onEnd = (): void => finish(true);
      const onErr = (): void => finish(false);
      const onSkip = (): void => finish(true);
      const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') finish(true); };
      this.abortFn = (): void => { done = true; window.clearTimeout(loadTimer); this.root.hidden = true; this.root.classList.remove('show'); this.video.pause(); resolve(false); };

      this.video.addEventListener('ended', onEnd);
      this.video.addEventListener('error', onErr);
      this.skip.addEventListener('click', onSkip);
      window.addEventListener('keydown', onKey);

      this.video.muted = audio.muted;                       // ikuti tombol mute/volume game
      this.video.volume = audio.volume;
      this.video.currentTime = 0;
      this.root.hidden = false;
      requestAnimationFrame(() => this.root.classList.add('show'));
      this.skip.focus({ preventScroll: true });
      loadTimer = window.setTimeout(() => { if (this.video.readyState < 3) finish(false); }, 6000);   // video tak kunjung siap
      const p = this.video.play();
      if (p) p.catch(() => { this.video.muted = true; this.video.play().catch(() => finish(false)); });   // autoplay bersuara diblokir -> coba tanpa suara
    });
  }

  /** Menutup paksa tanpa animasi (saat scene berakhir). */
  abort(): void { this.abortFn?.(); }
}
export const cutscene = new Cutscene();
