"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import MusicPanel from "./MusicPanel";
import Lounge from "./Lounge";
import SocialLinks from "./SocialLinks";

// 홈페이지는 음악에만 집중: 음악 · 라운지 두 탭
const NAME_EN = "Heebon Yang";
const NAME_KO = "양희본";

type Tab = "music" | "lounge";

const TAB_LABELS: Record<Tab, string> = { music: "음악", lounge: "라운지" };

const THEME = {
  music:  { active: "bg-brand-red text-white" },
  lounge: { active: "bg-brand-green text-white" },
};

export default function ProfileTabs() {
  const [tab, setTab] = useState<Tab>("music");

  // #music / #lounge 주소로 바로 해당 탭을 열 수 있게 함 (예전 #dental 주소는 음악 탭으로)
  useEffect(() => {
    if (window.location.hash.slice(1) === "lounge") setTab("lounge");
  }, []);

  // 모든 탭이 같은 폭을 씀
  const width = "max-w-5xl";

  const select = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <nav className={`${width} mx-auto px-4 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1`}>
          {/* 휴대폰에서도 이름이 보이도록, 좁은 화면에서는 글자·아이콘·탭 간격을 조금 줄여 한 줄에 맞춤 */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* 이름을 누르면 홈(음악 탭, 맨 위)으로 */}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setTab("music");
                history.replaceState(null, "", "/");
                window.scrollTo(0, 0);
              }}
              aria-label={`${NAME_KO} ${NAME_EN}, 처음으로`}
              className="inline-flex flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight text-stone-600 hover:text-stone-900 whitespace-nowrap"
            >
              {/* 휴대폰: 한글 이름 아래 영어를 작게 쌓아 한 줄에 맞춤 / 넓은 화면: 나란히 */}
              <span className="text-sm sm:text-base font-bold tracking-[0.04em]">{NAME_KO}</span>
              <span className="text-[10px] sm:text-sm font-semibold tracking-[0.1em] sm:tracking-[0.18em] uppercase">{NAME_EN}</span>
            </Link>
            <SocialLinks />
          </div>
          <div role="tablist" className="ml-auto flex shrink-0 sm:gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
            {(["music", "lounge"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => select(t)}
                className={`whitespace-nowrap px-1.5 sm:px-4 py-1.5 rounded-full ${tab === t ? THEME[t].active : "text-stone-500 hover:text-stone-900"}`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main role="tabpanel" className={`${width} mx-auto px-4`}>
        {tab === "music" && <MusicPanel />}
        {tab === "lounge" && <Lounge />}
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
