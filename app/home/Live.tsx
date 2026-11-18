"use client";
import { useEffect, useState } from "react";
import { YOUTUBE_URL } from "../music";
import type { PageContent } from "./pageContent";

// 첫 방송 날 (한국 시간). 그전에는 '일'까지, 그 뒤로는 매일 다음 방송까지 '시간:분:초'만 셈
const FIRST_LIVE = { y: 2026, m: 12, d: 14 };

const KST = 9 * 3600000;
const DAY = 86400000;
const two = (n: number) => String(n).padStart(2, "0");
const hourLabel = (h: number) => (h === 0 ? "자정" : h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `밤 ${h - 12}시`);

function parseStart(start: string) {
  const [h, m] = (start || "22:00").split(":").map(Number);
  return { h: Number.isNaN(h) ? 22 : h, m: m || 0 };
}

// now: 실제 시각(ms). 한국 시간 기준으로 다음 방송 시작까지 남은 ms, 방송 중인지 계산
function status(live: PageContent["live"], now: number) {
  const { h, m } = parseStart(live.start);
  const len = Math.max(1, Number(live.minutes) || 60) * 60000;
  const k = now + KST; // 한국 시각을 UTC 칸에 담음
  const today = Math.floor(k / DAY) * DAY;
  const startOf = (day: number) => day + (h * 60 + m) * 60000;
  const first = startOf(Date.UTC(FIRST_LIVE.y, FIRST_LIVE.m - 1, FIRST_LIVE.d));
  if (k < first) return { onAir: false, beforeFirst: true, left: first - k, h, m, len };
  // 어제 시작한 방송이 자정을 넘겨 이어질 수도 있음
  for (const s of [startOf(today - DAY), startOf(today)]) if (s >= first && k >= s && k < s + len) return { onAir: true, beforeFirst: false, left: 0, h, m, len };
  let next = startOf(today);
  if (next <= k) next += DAY;
  return { onAir: false, beforeFirst: false, left: next - k, h, m, len };
}

export default function Live({ live }: { live: PageContent["live"] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const s = now !== null ? status(live, now) : null;
  const endMin = s ? (s.h * 60 + s.m + s.len / 60000) % 1440 : 0;
  const range = s
    ? `${hourLabel(s.h)}${s.m ? ` ${s.m}분` : ""} ~ ${hourLabel(Math.floor(endMin / 60)).replace("밤 ", "")}${endMin % 60 ? ` ${endMin % 60}분` : ""}`
    : "밤 10시 ~ 11시";

  const sec = s ? Math.ceil(s.left / 1000) : 0;
  const units: [string, string][] = s
    ? [
        ...(s.beforeFirst ? ([[String(Math.floor(sec / 86400)), "일"]] as [string, string][]) : []),
        [two(Math.floor((sec % 86400) / 3600)), "시간"],
        [two(Math.floor((sec % 3600) / 60)), "분"],
        [two(sec % 60), "초"],
      ]
    : [];

  const caption = !s
    ? " "
    : s.onAir
      ? "지금, 세로 라이브 중"
      : s.beforeFirst
        ? `${FIRST_LIVE.m}월 ${FIRST_LIVE.d}일, 첫 세로 라이브까지`
        : "다음 세로 라이브까지";

  return (
    <a className={`ytlive${s?.onAir ? " on" : ""}`} href={YOUTUBE_URL} target="_blank" rel="noopener" aria-label="유튜브 양희본 채널 열기">
      <svg className="ytlogo" viewBox="0 0 28 20" aria-hidden>
        <rect className="yt-body" width="28" height="20" rx="5.6" />
        <path className="yt-play" d="M11.2 5.7v8.6l7.4-4.3z" />
      </svg>
      <span className="cd-caption">
        {s?.onAir && <i className="onair-dot" aria-hidden />}
        {caption}
      </span>
      {s?.onAir ? (
        <span className="cd onair-now serif">ON AIR</span>
      ) : (
        <span className="cd" role="timer" aria-live="off">
          {s ? (
            units.map(([v, u], i) => (
              <span key={u} className="cd-unit">
                {i > 0 && <span className="cd-sep" aria-hidden>:</span>}
                <span className="cd-box">
                  <b className="serif">{v}</b>
                  <small>{u}</small>
                </span>
              </span>
            ))
          ) : (
            <span className="cd-box">
              <b className="serif">&nbsp;</b>
              <small>&nbsp;</small>
            </span>
          )}
        </span>
      )}
      <span className="live-notice">
        <span className="live-notice-tag">공지</span>
        <span className="live-notice-text">{live.label?.trim() || `매일 ${range}, 세로 라이브`}</span>
      </span>
    </a>
  );
}
