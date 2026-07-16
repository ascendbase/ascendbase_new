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
  const queueRef = useRef<Track[]>([]);
  const idxRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  // Create the Audio element ONCE. Never recreate it (that was the bug:
  // recreating on queue change orphaned the instance we called .play() on).
  useEffect(() => {
    const a = new Audio();
    a.preload = "none";
    a.addEventListener("ended", () => {
      const next = idxRef.current + 1;
      if (next >= queueRef.current.length) {
        setPlaying(false);
        return;
      }
      idxRef.current = next;
      a.src = queueRef.current[next].src;
      a.play().catch(() => {});
    });
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (!playing) {
      // First play: build a fresh random queue and start at track 0.
      if (queueRef.current.length === 0) {
        const q = shuffle(TRACKS);
        queueRef.current = q;
        idxRef.current = 0;
        a.src = q[0].src;
      }
      a.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      a.pause();
      setPlaying(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[220px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-3 rounded-2xl border border-red/30 bg-black/70 px-3 py-2.5 backdrop-blur-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
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
            Vault radio
          </div>
          <div className="truncate text-[10px] text-white/40">
            {playing ? "Now playing" : "Tap play for a random mix"}
          </div>
        </div>
      </div>
    </div>
  );
}