import { REDUCED_MOTION } from '../config';

/** Video latar: autoplay muted + fallback visual (poster/awan CSS) jika video gagal atau diblokir. */
export function initBackground(): void {
  const video = document.getElementById('bg-video') as HTMLVideoElement | null;
  if (!video) return;
  const fail = (): void => document.body.classList.add('no-video');
  video.addEventListener('error', fail);
  video.querySelector('source')?.addEventListener('error', fail);
  video.muted = true;
  const play = (): void => { video.play().catch(() => { /* autoplay diblokir: poster tetap tampil */ }); };
  if (REDUCED_MOTION) { video.pause(); return; }
  const p = video.play();
  if (p) p.catch(() => {
    window.addEventListener('pointerdown', play, { once: true });
    window.addEventListener('keydown', play, { once: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (!document.body.classList.contains('in-game') && !REDUCED_MOTION) play();
  });
}

/** Saat masuk gameplay: sembunyikan video & hentikan pemutaran agar hemat baterai. */
export function setInGame(on: boolean): void {
  document.body.classList.toggle('in-game', on);
  const video = document.getElementById('bg-video') as HTMLVideoElement | null;
  if (!video) return;
  if (on) video.pause();
  else if (!REDUCED_MOTION) video.play().catch(() => { /* abaikan */ });
}
