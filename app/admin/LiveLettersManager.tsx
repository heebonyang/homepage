"use client";
import { useCallback, useEffect, useState } from "react";
import type { FirebaseServices } from "../firebase";
import { deleteLetter, loadLetters, markLetter, type LetterKind, type LiveLetter } from "../liveLetters";

// 세로 라이브 사연 · 신청곡: 홈페이지 LIVE 칸에서 보낸 편지. 라이브 중에 골라 읽고 '읽음'으로 표시
type Filter = "all" | LetterKind | "unread";
const FILTERS: Record<Filter, string> = { unread: "안 읽은 편지", all: "전체", story: "사연", song: "신청곡" };

function when(l: LiveLetter) {
  const d = l.createdAt?.toDate?.();
  if (!d) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function LiveLettersManager({ fb }: { fb: FirebaseServices }) {
  const [letters, setLetters] = useState<LiveLetter[] | null>(null);
  const [filter, setFilter] = useState<Filter>("unread");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const reload = useCallback(() => {
    loadLetters(fb)
      .then(setLetters)
      .catch(() => setError("편지를 불러오지 못했어요. 관리자 계정으로 로그인했는지 확인해 주세요."));
  }, [fb]);

  useEffect(reload, [reload]);

  const toggleRead = async (l: LiveLetter) => {
    const read = !l.read;
    setLetters((list) => list?.map((x) => (x.id === l.id ? { ...x, read } : x)) ?? null);
    await markLetter(fb, l.id, read).catch(() => {
      setError("표시하지 못했어요. 잠시 후 다시 시도해 주세요.");
      reload();
    });
  };

  const remove = async (id: string) => {
    setConfirm(null);
    await deleteLetter(fb, id).catch(() => setError("지우지 못했어요."));
    reload();
  };

  if (error) return <p className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!letters) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const shown = letters.filter((l) => (filter === "all" ? true : filter === "unread" ? !l.read : l.kind === filter));
  const count = (f: Filter) => letters.filter((l) => (f === "all" ? true : f === "unread" ? !l.read : l.kind === f)).length;

  return (
    <div className="mt-8 grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm border ${filter === f ? "bg-[#15489E] border-[#15489E] text-white" : "border-stone-200 bg-white text-stone-600 hover:text-stone-900"}`}
          >
            {FILTERS[f]} <span className="tabular-nums opacity-70">{count(f)}</span>
          </button>
        ))}
        <button type="button" onClick={reload} className="ml-auto text-sm text-stone-500 hover:text-stone-900">
          새로고침
        </button>
      </div>

      {shown.length === 0 && (
        <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
          {filter === "unread" ? "안 읽은 편지가 없어요." : "아직 들어온 편지가 없어요. 홈페이지 LIVE 칸의 '사연 · 신청곡 보내기'로 들어와요."}
        </p>
      )}

      <ul className="grid gap-3">
        {shown.map((l) => (
          <li key={l.id} className={`rounded-2xl border p-5 ${l.read ? "border-stone-200 bg-stone-50 text-stone-500" : "border-[#15489E]/30 bg-[#FEF7ED]"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${l.kind === "song" ? "bg-amber-100 text-amber-800" : "bg-[#15489E]/10 text-[#15489E]"}`}>
                {l.kind === "song" ? "신청곡" : "사연"}
              </span>
              <span className="font-semibold text-stone-900">From. {l.name}</span>
              <span className="text-stone-400 tabular-nums">{when(l)}</span>
            </div>
            {l.kind === "song" && <p className="mt-3 text-lg font-bold text-stone-900">♪ {l.song}</p>}
            {l.message && <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed text-stone-800">{l.message}</p>}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <button type="button" onClick={() => toggleRead(l)} className={`px-4 py-1.5 rounded-full ${l.read ? "border border-stone-300 text-stone-600" : "bg-[#15489E] text-white"}`}>
                {l.read ? "안 읽음으로" : "라이브에서 읽었어요"}
              </button>
              {confirm === l.id ? (
                <span className="flex items-center gap-3">
                  <button type="button" onClick={() => remove(l.id)} className="text-red-700 font-medium">
                    정말 지우기
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className="text-stone-500">
                    취소
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(l.id)} className="text-stone-400 hover:text-red-700">
                  지우기
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
