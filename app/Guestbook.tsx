"use client";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

// 오늘 밤 한마디 (예전 방명록, 저장 위치는 guestbook 그대로). 라이브에서 사연·신청곡으로 읽어 줌
// liked: 홈페이지 주인(관리자)이 라이브에서 읽은 글에 남기는 표시 (하트)
export type GuestbookEntry = { id: string; name: string; message: string; createdAt: Timestamp | null; liked?: boolean };

export const NAME_MAX = 30;
export const MESSAGE_MAX = 500;
const PASSWORD_MIN = 4;
// 홈페이지에서 쓰는 한마디는 짧게 (저장 규칙은 500자까지)
const WRITE_MAX = 300;
// 처음에 보이는 글 수, 더 보기 한 번에 늘어나는 수
const PAGE = 6;

// 비밀번호는 글 번호와 섞어 SHA-256 해시로만 저장 (같은 비밀번호라도 글마다 다른 값이 됨)
async function hashPassword(postId: string, password: string) {
  const bytes = new TextEncoder().encode(`${postId}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 글과 비밀번호 해시를 한 번에 저장
async function createEntry(name: string, message: string, password: string) {
  const fb = await getFirebase();
  if (!fb) throw new Error("unavailable");
  const ref = doc(collection(fb.db, "guestbook"));
  const batch = writeBatch(fb.db);
  batch.set(ref, { name, message, createdAt: serverTimestamp() });
  batch.set(doc(fb.db, "guestbookKeys", ref.id), { hash: await hashPassword(ref.id, password) });
  await batch.commit();
}

// 비밀번호가 맞으면 삭제됨. 틀리면 규칙에 막혀 permission-denied 오류가 남
async function deleteEntry(id: string, password: string) {
  const fb = await getFirebase();
  if (!fb) throw new Error("unavailable");
  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, "guestbookUnlock", id), { hash: await hashPassword(id, password) });
  batch.delete(doc(fb.db, "guestbook", id));
  await batch.commit();
}

function DeleteControl({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-stone-400 hover:text-red-700">
        삭제
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await deleteEntry(id, password);
      onDeleted();
    } catch (err) {
      const denied = (err as { code?: string })?.code === "permission-denied";
      setError(denied ? "비밀번호가 맞지 않아요." : "삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <input
        id={`guestbook-delete-${id}`}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        aria-label="글 비밀번호"
        autoFocus
        required
        className="w-28 rounded-lg border border-stone-300 px-2 py-1 focus:outline-none focus:border-stone-900"
      />
      <button type="submit" disabled={busy} className="text-red-700 font-medium disabled:opacity-50">
        삭제
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setPassword("");
          setError("");
        }}
        className="text-stone-500"
      >
        취소
      </button>
      {error && <span className="w-full text-right text-red-700">{error}</span>}
    </form>
  );
}

export function HeartIcon({ filled = false, size = 16 }: { filled?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" strokeLinejoin="round" />
    </svg>
  );
}

export async function loadGuestbook(): Promise<GuestbookEntry[] | null> {
  const fb = await getFirebase();
  if (!fb) return null;
  try {
    const snap = await getDocs(query(collection(fb.db, "guestbook"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GuestbookEntry, "id">) }));
  } catch {
    return null;
  }
}

export function formatDate(ts: Timestamp | null) {
  if (!ts) return "";
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

// 이름 색: 무지개 7색(빨주노초파남보) 중 글 번호로 무작위 선택. 새로고침해도 같은 글은 같은 색
const NAME_COLORS = [
  "text-red-600",
  "text-orange-500",
  "text-yellow-600",
  "text-green-600",
  "text-blue-600",
  "text-indigo-700",
  "text-violet-600",
];

// 색을 다시 섞고 싶으면 이 숫자만 바꾸면 됨
const COLOR_SEED = 12;

function nameColor(postId: string) {
  let x = COLOR_SEED;
  for (let i = 0; i < postId.length; i++) x = Math.imul(x ^ postId.charCodeAt(i), 0x01000193) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x ^= x >>> 16;
  return NAME_COLORS[(x >>> 0) % NAME_COLORS.length];
}

export default function Guestbook() {
  // undefined: 불러오는 중 / null: 방명록을 쓸 수 없는 상태
  const [entries, setEntries] = useState<GuestbookEntry[] | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [visible, setVisible] = useState(PAGE);

  useEffect(() => {
    loadGuestbook().then(setEntries);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || password.length < PASSWORD_MIN) return;
    setStatus("sending");
    try {
      await createEntry(name.trim(), message.trim(), password);
      setMessage("");
      setPassword("");
      setStatus("sent");
      setEntries(await loadGuestbook());
    } catch {
      setStatus("error");
    }
  };

  const shown = entries?.slice(0, visible) ?? [];

  return (
    <div>
      {entries === null ? (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-stone-500">
          준비하고 있어요. 조금만 기다려 주세요.
        </p>
      ) : (
        <>
          {/* 쓰는 칸이 먼저: 한마디 · 이름 · 비밀번호(지울 때) */}
          <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 grid gap-3">
            <label className="sr-only" htmlFor="guestbook-message">
              한마디
            </label>
            <textarea
              id="guestbook-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={WRITE_MAX}
              rows={3}
              required
              placeholder="오늘 밤 라이브에서 듣고 싶은 노래, 들려주고 싶은 이야기, 안부 한마디"
              className="w-full rounded-xl bg-[#FFFBF5] border border-stone-200 px-4 py-3 text-[15px] leading-relaxed resize-none placeholder:text-stone-400 focus:outline-none focus:border-[#15489E]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="guestbook-name"
                aria-label="이름"
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                required
                className="min-w-0 flex-1 basis-[40%] sm:basis-auto sm:flex-none sm:w-36 rounded-full border border-stone-200 bg-[#FFFBF5] px-4 py-2 text-sm focus:outline-none focus:border-[#15489E]"
              />
              <input
                id="guestbook-password"
                type="password"
                aria-label={`비밀번호 (지울 때 필요, ${PASSWORD_MIN}자 이상)`}
                placeholder="비밀번호"
                title="글을 지울 때 필요해요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={PASSWORD_MIN}
                maxLength={50}
                required
                autoComplete="new-password"
                className="min-w-0 flex-1 basis-[40%] sm:basis-auto sm:flex-none sm:w-36 rounded-full border border-stone-200 bg-[#FFFBF5] px-4 py-2 text-sm focus:outline-none focus:border-[#15489E]"
              />
              <span className="ml-auto text-xs text-stone-400 tabular-nums">
                {message.length}/{WRITE_MAX}
              </span>
              <button
                type="submit"
                disabled={status === "sending"}
                className="px-5 py-2 rounded-full bg-[#15489E] text-white text-sm font-semibold hover:bg-[#0F3A85] disabled:opacity-50"
              >
                {status === "sending" ? "보내는 중…" : "보내기"}
              </button>
            </div>
            {status === "sent" && <p className="text-sm text-[#15489E]">보냈어요. 오늘 밤 라이브에서 만나요 🌙</p>}
            {status === "error" && <p className="text-sm text-red-700">보내지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
          </form>

          <ul className="grid gap-2" style={{ marginTop: 20 }}>
            {entries === undefined && <li className="py-4 text-stone-400">불러오는 중…</li>}
            {shown.map((entry) => (
              <li key={entry.id} className="rounded-2xl bg-white/70 border border-stone-200/70 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0">
                    <span className={`font-semibold ${nameColor(entry.id)}`}>{entry.name}</span>
                    <span className="ml-2 text-xs text-stone-400 tabular-nums">{formatDate(entry.createdAt)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    {/* 홈페이지 주인이 라이브에서 읽은 글에 관리자 페이지에서 표시 */}
                    {entry.liked && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                        <HeartIcon filled size={14} />
                        라이브에서 읽었어요
                      </span>
                    )}
                    <DeleteControl id={entry.id} onDeleted={() => setEntries((list) => list?.filter((x) => x.id !== entry.id))} />
                  </span>
                </div>
                <p className="mt-1 text-[15px] leading-relaxed text-stone-800 whitespace-pre-wrap [overflow-wrap:anywhere]">{entry.message}</p>
              </li>
            ))}
          </ul>
          {entries && entries.length > visible && (
            <button type="button" onClick={() => setVisible((v) => v + PAGE)} className="mt-4 w-full rounded-full border border-stone-200 py-2 text-sm text-stone-500 hover:text-stone-900">
              더 보기
            </button>
          )}
        </>
      )}
    </div>
  );
}
