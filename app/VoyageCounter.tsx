"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";
import { SOCIAL } from "./SocialLinks";

// 음악 탭 맨 위의 커다란 항해 카운터 (0집 페이지 heebonmd.web.app 의 'Day 100 라이브 항해'와 같은 날짜 계산)
// 출항 전: D-26 / 항해 중: DAY 23 / 100일 뒤 공연 전: 상륙 D-2 / 공연 당일: 상륙 / 공연이 지나면 숨김.
// 날짜는 관리자 '0집 페이지'(100일 라이브 시작일·기간, 공연 날짜)에서 바꾼 값을 씀.
const MD_SITE = "https://heebonmd.web.app";
const DEFAULTS = { startDate: "2026-12-14", days: 100, concertDate: "2027-03-27" };
const DAY = 86400000;

type Plan = { startDate: string; days: number; concertDate: string };
type View = { kicker: string; big: string; small?: string; line: string; progress: number | null };

function parse(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return y ? new Date(y, m - 1, day) : null;
}

function viewFor(plan: Plan, now = new Date()): View | null {
  const start = parse(plan.startDate);
  if (!start) return null;
  const days = plan.days || 100;
  const last = new Date(start.getFullYear(), start.getMonth(), start.getDate() + days - 1);
  const land = parse(plan.concertDate) ?? new Date(last.getFullYear(), last.getMonth(), last.getDate() + 4);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toStart = Math.round((+start - +today) / DAY);
  const toLand = Math.round((+land - +today) / DAY);
  const md = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`;

  if (toStart > 0)
    return {
      kicker: "DEPARTURE · 부산 광안리",
      big: `D-${toStart}`,
      line: `${md(start)}, 광안리에서 출항해요. ${days}일 동안 매일 유튜브 라이브로 노래합니다.`,
      progress: null,
    };
  if (-toStart < days) {
    const n = 1 - toStart;
    return {
      kicker: `DAY ${days} LIVE · 항해 중`,
      big: `DAY ${n}`,
      small: `/ ${days}`,
      line: `오늘도 유튜브 라이브에서 만나요. 육지(공연)까지 ${toLand}일.`,
      progress: n / days,
    };
  }
  if (toLand > 0)
    return { kicker: `${days}일 항해 완주`, big: `상륙 D-${toLand}`, line: `${md(land)}, 공연장에서 만나요.`, progress: 1 };
  if (toLand === 0) return { kicker: "LANDFALL · CONCERT", big: "오늘, 상륙", line: "오늘 공연장에서 만나요.", progress: 1 };
  return null; // 공연이 지나면 숨김
}

export default function VoyageCounter() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      const fb = await getFirebase();
      if (!fb) return setPlan(DEFAULTS);
      try {
        const data = (await getDoc(doc(fb.db, "settings", "albumPage"))).data() as
          | { live?: { startDate?: string; days?: number }; concert?: { date?: string } }
          | undefined;
        setPlan({
          startDate: data?.live?.startDate || DEFAULTS.startDate,
          days: Number(data?.live?.days) || DEFAULTS.days,
          concertDate: data?.concert?.date || DEFAULTS.concertDate,
        });
      } catch {
        setPlan(DEFAULTS);
      }
    })();
  }, []);

  // 날짜는 방문자 기기 기준으로 계산하므로 불러온 뒤에만 그림
  const view = plan ? viewFor(plan) : null;
  if (plan && !view) return null;

  return (
    <section
      aria-label="100일 라이브 항해"
      className="relative mt-2 mb-8 overflow-hidden rounded bg-[#0D1230] px-6 py-10 sm:px-12 sm:py-14 font-kr text-album-cream"
    >
      {/* 광안대교 불빛처럼 이어진 점 */}
      <div
        aria-hidden
        className="absolute inset-x-6 sm:inset-x-12 top-6 h-1 opacity-50"
        style={{ backgroundImage: "radial-gradient(circle, rgba(254,247,237,.8) 1.3px, transparent 1.8px)", backgroundSize: "22px 4px" }}
      />
      <p className="text-xs sm:text-sm tracking-[0.24em] text-[#8EC3FF] min-h-[1.25rem]">{view?.kicker}</p>
      <p className="mt-3 font-serif font-bold leading-none tracking-tight text-[clamp(72px,19vw,200px)] min-h-[0.9em] tabular-nums">
        {view?.big}
        {view?.small && <span className="ml-3 align-baseline text-[0.28em] font-normal text-[#AEB7D6]">{view.small}</span>}
      </p>
      {view?.progress != null && (
        <div className="mt-6 h-1.5 w-full max-w-xl overflow-hidden rounded-full bg-white/15" aria-hidden>
          <div className="h-full rounded-full bg-album-cream" style={{ width: `${Math.round(view.progress * 100)}%` }} />
        </div>
      )}
      <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#D3DCF0] min-h-[1.75rem]">{view?.line}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <a
          href={SOCIAL.youtube}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center min-h-[48px] px-6 rounded-full bg-album-cream text-[#0D1230] font-bold hover:opacity-90"
        >
          유튜브 라이브 보기
        </a>
        <a
          href={`${MD_SITE}/#live`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center min-h-[48px] px-6 rounded-full border border-album-cream/50 text-album-cream hover:bg-white/10"
        >
          항해 일정 보기 →
        </a>
      </div>
    </section>
  );
}
