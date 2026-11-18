"use client";
import Link from "next/link";
import { useEffect } from "react";
import MusicPanel, { Contact } from "./MusicPanel";
import Lounge from "./Lounge";
import SocialLinks from "./SocialLinks";

// 홈페이지는 '양희본' 한 페이지: 음악 → 라운지(공지·방명록) → 문의 순서로 내려가며 봄 (탭 없음)
const NAME_EN = "Heebon Yang";
const NAME_KO = "양희본";

export default function ProfileTabs() {
  // 예전 #lounge 주소로 들어오면 라운지 구역으로 내려감 (내용을 불러온 뒤)
  useEffect(() => {
    if (window.location.hash !== "#lounge") return;
    const t = setTimeout(() => document.getElementById("lounge")?.scrollIntoView({ behavior: "smooth" }), 600);
    return () => clearTimeout(t);
  }, []);

  const width = "max-w-5xl";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <nav className={`${width} mx-auto px-4 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1`}>
          {/* 왼쪽 이름(누르면 맨 위로), 오른쪽 유튜브·인스타그램 */}
          <Link
            href="/"
            onClick={(e) => {
              e.preventDefault();
              history.replaceState(null, "", "/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label={`${NAME_KO} ${NAME_EN}, 처음으로`}
            className="inline-flex flex-col sm:flex-row sm:items-baseline sm:gap-2 leading-tight text-stone-600 hover:text-stone-900 whitespace-nowrap"
          >
            {/* 휴대폰: 한글 이름 아래 영어를 작게 쌓아 한 줄에 맞춤 / 넓은 화면: 나란히 */}
            <span className="text-sm sm:text-base font-bold tracking-[0.04em]">{NAME_KO}</span>
            <span className="text-[10px] sm:text-sm font-semibold tracking-[0.1em] sm:tracking-[0.18em] uppercase">{NAME_EN}</span>
          </Link>
          <SocialLinks />
        </nav>
      </header>

      <main className={`${width} mx-auto px-4`}>
        <MusicPanel />
        <Lounge />
        <Contact />
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
