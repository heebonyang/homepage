"use client";
import { useEffect, useState } from "react";
import Guestbook, { formatDate } from "../Guestbook";
import { loadNotices, type Notice } from "../notices";
import { useSiteSettings } from "../siteSettings";

type Board = "notices" | "guestbook";

// 공지 본문 속 http(s) 주소를 눌러서 열 수 있는 링크로 바꿈
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-stone-900">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

const BOARD_LABELS: Record<Board, string> = { notices: "공지", guestbook: "방명록" };

function Notices() {
  const [notices, setNotices] = useState<Notice[] | undefined>(undefined);
  // 처음에는 모두 접어 두고, 눌러야 내용이 보임
  const [open, setOpen] = useState<number | null>(null);

  const settings = useSiteSettings();
  useEffect(() => {
    if (!settings) return;
    // 관리자 페이지에서 공지를 관리하기 시작한 뒤로는 데이터베이스 공지만 보여 줌 (모두 지우면 기본 공지도 안 나옴)
    loadNotices({ showStaticWhenEmpty: !settings.noticesInDb }).then((r) => setNotices(r.notices));
  }, [settings]);

  if (notices === undefined) return <p className="py-6 text-stone-400">불러오는 중…</p>;
  if (notices.length === 0) return <p className="py-6 text-stone-500">아직 공지가 없어요.</p>;

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
      {notices.map((notice, i) => (
        <li key={notice.id ?? i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center gap-3 py-5 text-left"
          >
            {notice.pinned && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-900 text-white text-xs">고정</span>
            )}
            <span className="flex-1 min-w-0 font-medium text-stone-900 truncate">{notice.title}</span>
            <span className="shrink-0 text-sm text-stone-400 tabular-nums">{formatDate(notice.createdAt)}</span>
            <span className={`shrink-0 text-stone-400 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </button>
          {open === i && <p className="pb-6 leading-relaxed whitespace-pre-wrap break-words"><Linkified text={notice.body} /></p>}
        </li>
      ))}
    </ul>
  );
}

export default function Lounge() {
  const [board, setBoard] = useState<Board>("notices");
  const settings = useSiteSettings();

  return (
    // 라운지: 공지 · 방명록. 공연 아래 크림색 판 위에 (관리자 '공지'·'방명록'에서 관리)
    <section id="lounge" className="lounge">
      <div className="wrap">
        <div className="lounge-panel">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="kicker">LOUNGE</div>
              <h2 className="serif lounge-title">라운지</h2>
              {settings?.loungeTagline && <p className="mt-1 text-sm text-stone-500">{settings.loungeTagline}</p>}
            </div>
            <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
              {(Object.keys(BOARD_LABELS) as Board[]).map((b) => (
                <button
                  key={b}
                  role="tab"
                  aria-selected={board === b}
                  onClick={() => setBoard(b)}
                  className={`px-4 py-1.5 rounded-full ${board === b ? "bg-[#15489E] text-white" : "text-stone-500 hover:text-stone-900"}`}
                >
                  {BOARD_LABELS[b]}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">{board === "notices" ? <Notices /> : <Guestbook />}</div>
        </div>
      </div>
    </section>
  );
}
