"use client";
import { useEffect, useRef, useState } from "react";
import { useMusicData } from "../musicData";
import { imageSrc } from "./pageContent";

// 발매곡: 표지 · 제목 · 발매일, 음원이 있으면 ▶ 로 바로 듣기 (한 번에 한 곡)
export default function Music() {
  const data = useMusicData();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const releases = (data?.releases ?? []).filter((r) => !r.example);
  if (data && releases.length === 0) return null;

  const play = (src: string) => {
    if (!audio.current) {
      audio.current = new Audio();
      audio.current.addEventListener("ended", () => setPlaying(null));
    }
    if (playing === src) {
      audio.current.pause();
      setPlaying(null);
      return;
    }
    audio.current.src = src;
    audio.current.play().catch(() => setPlaying(null));
    setPlaying(src);
  };

  return (
    <section id="music" className="music">
      <div className="wrap">
        <div className="kicker">MUSIC</div>
        <h2 className="serif">발매곡</h2>
        <ul className="releases" aria-busy={!data}>
          {(data ? releases : [null, null]).map((r, i) =>
            r ? (
              <li key={r.id ?? r.title} className="release">
                {r.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageSrc(r.cover)} alt="" className="rel-cover" />
                ) : (
                  <span className="rel-cover rel-blank" aria-hidden>
                    {r.title.slice(0, 1)}
                  </span>
                )}
                <span className="rel-text">
                  <b>{r.title}</b>
                  <small>
                    {r.team ? `${r.team} · ` : ""}
                    {r.type} · {r.date}
                  </small>
                </span>
                {r.audio && (
                  <button
                    type="button"
                    className={`play${playing === r.audio ? " on" : ""}`}
                    aria-label={`${r.title} ${playing === r.audio ? "멈춤" : "듣기"}`}
                    onClick={() => play(r.audio!)}
                  >
                    {playing === r.audio ? (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                        <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                        <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                      </svg>
                    )}
                  </button>
                )}
              </li>
            ) : (
              <li key={i} className="release loading" aria-hidden />
            ),
          )}
        </ul>
      </div>
    </section>
  );
}
