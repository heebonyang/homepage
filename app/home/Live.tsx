"use client";
import { useEffect, useState } from "react";
import { YOUTUBE_URL } from "../music";
import type { PageContent } from "./pageContent";

// 첫 방송 날 (한국 시간). 이날이 지나면 D-day 표시는 저절로 사라짐
const FIRST_LIVE = { y: 2026, m: 12, d: 14 };

const KST = 9 * 3600000;
const DAY = 86400000;

// 한국 시간 기준 시각을 UTC 칸에 담아 다룸
const kstNow = () => new Date(Date.now() + KST);

function parseStart(start: string) {
  const [h, m] = (start || "22:00").split(":").map(Number);
  return { h: Number.isNaN(h) ? 22 : h, m: m || 0 };
}

const two = (n: number) => String(n).padStart(2, "0");
const hourLabel = (h: number) => (h === 0 ? "자정" : h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `밤 ${h - 12}시`);

function status(live: PageContent["live"], now: Date) {
  const { h, m } = parseStart(live.start);
  const len = Math.max(1, Number(live.minutes) || 60);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const first = Date.UTC(FIRST_LIVE.y, FIRST_LIVE.m - 1, FIRST_LIVE.d);
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMin = h * 60 + m;
  const sinceStart = (nowMin - startMin + 1440) % 1440;
  const onAir = today >= first && (sinceStart < len) && !(today === first && nowMin < startMin);
  const dday = Math.round((first - today) / DAY);
  // 다음 방송까지 남은 분
  const left = (startMin - nowMin + 1440) % 1440;
  return { onAir, dday, left, h, m, len };
}

export default function Live({ live }: { live: PageContent["live"] }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(kstNow());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const s = now ? status(live, now) : null;
  const end = s ? (s.h * 60 + s.m + s.len) % 1440 : 0;
  const range = s ? `${hourLabel(s.h)}${s.m ? ` ${s.m}분` : ""} ~ ${hourLabel(Math.floor(end / 60)).replace("밤 ", "")}${end % 60 ? ` ${end % 60}분` : ""}` : "";

  let note = "";
  if (s && !s.onAir) {
    if (s.dday > 0) note = "";
    else if (s.left <= 180) note = s.left < 60 ? `${s.left}분 뒤에 시작해요` : `${Math.floor(s.left / 60)}시간 ${s.left % 60}분 뒤에 시작해요`;
    else note = "오늘 밤에 만나요";
  }

  return (
    <a className={`ytlive${s?.onAir ? " on" : ""}`} href={YOUTUBE_URL} target="_blank" rel="noopener" aria-label="유튜브 양희본 채널 열기">
      {s && s.dday >= 0 && (
        <span className="dday">
          <b>{s.dday === 0 ? "D-DAY" : `D-${s.dday}`}</b>
          <span>{s.dday === 0 ? "오늘 밤, 첫 세로 라이브" : `${FIRST_LIVE.m}월 ${FIRST_LIVE.d}일 첫 세로 라이브`}</span>
        </span>
      )}
      <svg className="ytlogo" viewBox="0 0 28 20" aria-hidden>
        <rect className="yt-body" width="28" height="20" rx="5.6" />
        <path className="yt-play" d="M11.2 5.7v8.6l7.4-4.3z" />
      </svg>
      <span className="clock" aria-label={now ? `지금 광안리 ${now.getUTCHours()}시 ${now.getUTCMinutes()}분` : undefined}>
        <span className="clock-place">GWANGALLI · NOW</span>
        <span className="clock-time">
          {now ? (
            <>
              {two(now.getUTCHours())}
              <i className={now.getUTCSeconds() % 2 ? "blink" : ""}>:</i>
              {two(now.getUTCMinutes())}
            </>
          ) : (
            " "
          )}
        </span>
      </span>
      <span className="yt-when serif">
        {s?.onAir ? (
          <>
            <i className="onair-dot" aria-hidden />
            지금, 세로 라이브 중
          </>
        ) : (
          <>매일 {range || "밤 10시 ~ 11시"}, 세로 라이브</>
        )}
      </span>
      <span className="yt-note">{s?.onAir ? "들어와서 같이 들어요" : note || " "}</span>
    </a>
  );
}
