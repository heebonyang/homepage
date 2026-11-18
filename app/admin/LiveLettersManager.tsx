"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FirebaseServices } from "../firebase";
import {
  addToRepertoire,
  deleteLetter,
  deleteRepertoire,
  loadLetters,
  loadRepertoire,
  markLetter,
  REP_STATUS,
  songKey,
  updateRepertoire,
  type LiveLetter,
  type RepSong,
  type RepStatus,
} from "../liveLetters";

// 세로 라이브 사연 · 신청곡 (홈페이지 LIVE 칸 편지)
//   사연     : 라이브에서 골라 읽고 '라이브에서 읽었어요'로 표시
//   신청곡   : 같은 곡끼리 묶어 몇 명이 신청했는지, 마음에 들면 '레파토리에 담기'
//   레파토리 : 들어볼 곡 → 연습 중 → 부를 수 있어요, 곡마다 메모(키·코드 등)
type Tab = "story" | "song" | "rep";
const TABS: Record<Tab, string> = { story: "사연", song: "신청곡", rep: "레파토리" };

function when(ts: LiveLetter["createdAt"], withTime = true) {
  const d = ts?.toDate?.();
  if (!d) return "";
  const day = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return withTime ? `${day} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : day;
}

function Confirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed)
    return (
      <button type="button" onClick={() => setArmed(true)} className="text-stone-400 hover:text-red-700">
        {label}
      </button>
    );
  return (
    <span className="flex items-center gap-3">
      <button type="button" onClick={onConfirm} className="text-red-700 font-medium">
        정말 {label}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-stone-500">
        취소
      </button>
    </span>
  );
}

type SongGroup = { key: string; title: string; letters: LiveLetter[] };

export default function LiveLettersManager({ fb }: { fb: FirebaseServices }) {
  const [letters, setLetters] = useState<LiveLetter[] | null>(null);
  const [rep, setRep] = useState<RepSong[]>([]);
  const [tab, setTab] = useState<Tab>("story");
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [repFilter, setRepFilter] = useState<RepStatus | "all">("all");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [newSong, setNewSong] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    Promise.all([loadLetters(fb), loadRepertoire(fb)])
      .then(([l, r]) => {
        setLetters(l);
        setRep(r);
      })
      .catch(() => setError("불러오지 못했어요. 관리자 계정으로 로그인했는지 확인해 주세요."));
  }, [fb]);

  useEffect(reload, [reload]);

  const fail = (msg: string) => () => {
    setError(msg);
    reload();
  };

  // 같은 곡 신청을 묶음 (많이 신청한 곡이 위로, 같으면 최근 신청이 위로)
  const groups = useMemo<SongGroup[]>(() => {
    const map = new Map<string, SongGroup>();
    for (const l of letters ?? []) {
      if (l.kind !== "song") continue;
      const key = songKey(l.song);
      const g = map.get(key) ?? { key, title: l.song, letters: [] };
      g.letters.push(l);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.letters.length - a.letters.length || (b.letters[0].createdAt?.toMillis() ?? 0) - (a.letters[0].createdAt?.toMillis() ?? 0));
  }, [letters]);
  const requestCount = (key: string) => groups.find((g) => g.key === key)?.letters.length ?? 0;
  const repByKey = useMemo(() => new Map(rep.map((r) => [r.id, r])), [rep]);

  if (error)
    return (
      <p className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}{" "}
        <button type="button" className="underline" onClick={() => setError("")}>
          닫기
        </button>
      </p>
    );
  if (!letters) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const stories = letters.filter((l) => l.kind === "story");
  const shownStories = unreadOnly ? stories.filter((l) => !l.read) : stories;
  const counts: Record<Tab, number> = { story: stories.filter((l) => !l.read).length, song: groups.length, rep: rep.length };

  const toggleRead = (l: LiveLetter) => {
    const read = !l.read;
    setLetters((list) => list?.map((x) => (x.id === l.id ? { ...x, read } : x)) ?? null);
    markLetter(fb, l.id, read).catch(fail("표시하지 못했어요. 잠시 후 다시 시도해 주세요."));
  };

  const addRep = async (title: string) => {
    const t = title.trim();
    if (!t) return;
    await addToRepertoire(fb, t).catch(fail("레파토리에 담지 못했어요."));
    reload();
  };

  const patchRep = (id: string, data: Partial<Pick<RepSong, "status" | "note">>) => {
    setRep((list) => list.map((r) => (r.id === id ? { ...r, ...data } : r)));
    updateRepertoire(fb, id, data).catch(fail("저장하지 못했어요."));
  };

  const repOrder: RepStatus[] = ["listen", "practice", "ready"];
  const shownRep = rep
    .filter((r) => repFilter === "all" || r.status === repFilter)
    .sort((a, b) => repOrder.indexOf(a.status) - repOrder.indexOf(b.status) || requestCount(b.id) - requestCount(a.id) || a.title.localeCompare(b.title));

  return (
    <div className="mt-8 grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm border ${tab === t ? "bg-[#15489E] border-[#15489E] text-white" : "border-stone-200 bg-white text-stone-600 hover:text-stone-900"}`}
          >
            {TABS[t]} <span className="tabular-nums opacity-70">{counts[t]}</span>
          </button>
        ))}
        <button type="button" onClick={reload} className="ml-auto text-sm text-stone-500 hover:text-stone-900">
          새로고침
        </button>
      </div>

      {/* ── 사연 ── */}
      {tab === "story" && (
        <>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            안 읽은 사연만 보기
          </label>
          {shownStories.length === 0 && (
            <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              {unreadOnly ? "안 읽은 사연이 없어요." : "아직 들어온 사연이 없어요."}
            </p>
          )}
          <ul className="grid gap-3">
            {shownStories.map((l) => (
              <li key={l.id} className={`rounded-2xl border p-5 ${l.read ? "border-stone-200 bg-stone-50 text-stone-500" : "border-[#15489E]/30 bg-[#FEF7ED]"}`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-stone-900">From. {l.name}</span>
                  <span className="text-stone-400 tabular-nums">{when(l.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed text-stone-800">{l.message}</p>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <button type="button" onClick={() => toggleRead(l)} className={`px-4 py-1.5 rounded-full ${l.read ? "border border-stone-300 text-stone-600" : "bg-[#15489E] text-white"}`}>
                    {l.read ? "안 읽음으로" : "라이브에서 읽었어요"}
                  </button>
                  <Confirm
                    label="지우기"
                    onConfirm={async () => {
                      await deleteLetter(fb, l.id).catch(fail("지우지 못했어요."));
                      reload();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* ── 신청곡: 같은 곡끼리 묶음 ── */}
      {tab === "song" && (
        <>
          <p className="text-sm text-stone-500">같은 곡은 하나로 묶어 몇 명이 신청했는지 보여요. 들어 보고 마음에 들면 레파토리에 담아 두세요.</p>
          {groups.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">아직 들어온 신청곡이 없어요.</p>}
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {groups.map((g) => {
              const inRep = repByKey.get(g.key);
              const open = openGroup === g.key;
              return (
                <li key={g.key} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setOpenGroup(open ? null : g.key)} className="min-w-0 flex-1 text-left">
                      <span className="font-bold text-stone-900">♪ {g.title}</span>
                      <span className="ml-2 text-sm text-stone-500 tabular-nums">
                        {g.letters.length}명 신청 · 최근 {when(g.letters[0].createdAt, false)}
                      </span>
                      <span className="ml-1 text-stone-400" aria-hidden>
                        {open ? "▴" : "▾"}
                      </span>
                    </button>
                    {inRep ? (
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm">레파토리 · {REP_STATUS[inRep.status]}</span>
                    ) : (
                      <button type="button" onClick={() => addRep(g.title)} className="px-4 py-1.5 rounded-full bg-[#15489E] text-white text-sm">
                        + 레파토리에 담기
                      </button>
                    )}
                  </div>
                  {open && (
                    <ul className="mt-3 grid gap-2 border-l-2 border-[#15489E]/20 pl-4">
                      {g.letters.map((l) => (
                        <li key={l.id} className="text-sm">
                          <span className="font-medium text-stone-900">{l.name}</span>
                          <span className="ml-2 text-stone-400 tabular-nums">{when(l.createdAt)}</span>
                          {l.song !== g.title && <span className="ml-2 text-stone-400">({l.song})</span>}
                          {l.message && <p className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere] text-stone-700">{l.message}</p>}
                          <span className="mt-1 block">
                            <Confirm
                              label="지우기"
                              onConfirm={async () => {
                                await deleteLetter(fb, l.id).catch(fail("지우지 못했어요."));
                                reload();
                              }}
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ── 레파토리 ── */}
      {tab === "rep" && (
        <>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addRep(newSong);
              setNewSong("");
            }}
          >
            <input
              value={newSong}
              onChange={(e) => setNewSong(e.target.value)}
              placeholder="직접 추가할 곡 (예: 곡 제목 - 가수)"
              maxLength={100}
              className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm focus:outline-none focus:border-stone-900"
            />
            <button type="submit" className="px-4 py-2 rounded-full bg-stone-900 text-white text-sm">
              추가
            </button>
          </form>
          <div className="flex flex-wrap gap-2 text-sm">
            {(["all", ...repOrder] as (RepStatus | "all")[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setRepFilter(f)}
                className={`px-3 py-1 rounded-full border ${repFilter === f ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"}`}
              >
                {f === "all" ? "전체" : REP_STATUS[f]} <span className="tabular-nums opacity-70">{f === "all" ? rep.length : rep.filter((r) => r.status === f).length}</span>
              </button>
            ))}
          </div>
          {shownRep.length === 0 && (
            <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              {rep.length === 0 ? "아직 담은 곡이 없어요. '신청곡'에서 마음에 드는 곡을 담거나 위에서 직접 추가하세요." : "이 단계의 곡이 없어요."}
            </p>
          )}
          <ul className="grid gap-3">
            {shownRep.map((r) => (
              <li key={r.id} className={`rounded-2xl border p-4 ${r.status === "ready" ? "border-emerald-200 bg-emerald-50/50" : "border-stone-200 bg-white"}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 font-bold text-stone-900">
                    ♪ {r.title}
                    {requestCount(r.id) > 0 && <span className="ml-2 text-sm font-normal text-stone-500 tabular-nums">{requestCount(r.id)}명 신청</span>}
                  </span>
                  <div className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
                    {repOrder.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => patchRep(r.id, { status: st })}
                        className={`px-3 py-1 rounded-full ${r.status === st ? (st === "ready" ? "bg-emerald-600 text-white" : "bg-[#15489E] text-white") : "text-stone-500 hover:text-stone-900"}`}
                      >
                        {REP_STATUS[st]}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  defaultValue={r.note}
                  onBlur={(e) => e.target.value !== r.note && patchRep(r.id, { note: e.target.value })}
                  placeholder="메모 (키, 코드, 편곡 아이디어 등) · 칸 밖을 누르면 저장"
                  rows={2}
                  maxLength={2000}
                  className="mt-3 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm resize-y focus:outline-none focus:border-stone-900"
                />
                <div className="mt-2 text-right text-sm">
                  <Confirm
                    label="빼기"
                    onConfirm={async () => {
                      await deleteRepertoire(fb, r.id).catch(fail("빼지 못했어요."));
                      reload();
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
