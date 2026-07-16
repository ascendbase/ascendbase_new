"use client";

import { useEffect, useRef, useState } from "react";

type Track = { src: string; name: string };

const TRACKS: Track[] = [
  { src: "/music/Michael Jackson - Dirty Diana (Rock Reimagining).mp3", name: "Michael Jackson — Dirty Diana (Rock Reimagining)" },
  { src: "/music/NXCRE & The Villains - ENDLESS.mp3", name: "NXCRE & The Villains — ENDLESS" },
  { src: "/music/NXCRE & The Villains - USURPER.mp3", name: "NXCRE & The Villains — USURPER" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.addEventListener("ended", () => {
      setIdx((i) => {
        const next = i + 1;
        if (next >= queue.length) {
          setPlaying(false);
          return i;
        }
        a.src = queue[next].src;
        a.play().catch(() => {});
        return next;
      });
    });
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
    };
  }, [queue]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (!playing) {
      // Build a fresh random queue the first time we play.
      if (queue.length === 0) {
        const q = shuffle(TRACKS);
        setQueue(q);
        a.src = q[0].src;
        setIdx(0);
      }
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  const current = queue[idx] || null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[260px] max-w-[calc(100vw-2rem)]">
      <div className="overflow-hidden rounded-2xl border border-red/30 bg-black/70 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red text-black transition hover:scale-105"
          >
            {playing ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="3.5" height="12" rx="1" />
                <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-white/90">
              {current ? current.name : "Vault radio"}
            </div>
            <div className="truncate text-[10px] text-white/40">
              {playing ? "Now playing" : "Tap play for a random mix"}
            </div>
          </div>

          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Collapse"
            className="shrink-0 rounded-md px-1.5 py-1 text-white/40 hover:text-white"
          >
            {open ? "▾" : "▸"}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/10 px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {TRACKS.map((t) => {
                const active = current && current.src === t.src;
                return (
                  <button
                    key={t.src}
                    onClick={() => {
                      const a = audioRef.current;
                      if (!a) return;
                      // Re-shuffle starting from this track.
                      const rest = shuffle(TRACKS.filter((x) => x.src !== t.src));
                      const q = [t, ...rest];
                      setQueue(q);
                      setIdx(0);
                      a.src = q[0].src;
                      a.play()
                        .then(() => setPlaying(true))
                        .catch(() => setPlaying(false));
                    }}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                      active
                        ? "bg-red/20 text-red-glow"
                        : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {t.name.split("—")[0].trim()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}