"use client";
import { useCallback, useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, setDoc, type Timestamp } from "firebase/firestore/lite";
import type { FirebaseServices } from "../firebase";
import { HeartIcon } from "../Guestbook";

// 광안리 모래 방명록 (/guest): 하트 남기기 · 지우기. 하트는 모래 방명록 '지난 글'과 모래 위 이름 옆에 보임
type SandEntry = { id: string; t: string; n: string; at: Timestamp | null; liked?: boolean };

function when(ts: Timestamp | null) {
  const d = ts?.toDate?.();
  return d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}` : "";
}

export default function SandManager({ fb }: { fb: FirebaseServices }) {
  const [list, setList] = useState<SandEntry[] | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);

  const reload = useCallback(() => {
    getDocs(query(collection(fb.db, "sand"), orderBy("at", "desc"), limit(500)))
      .then((s) => setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SandEntry, "id">) }))))
      .catch(() => setError("불러오지 못했어요."));
  }, [fb]);
  useEffect(reload, [reload]);

  const toggle = async (e: SandEntry) => {
    const liked = !e.liked;
    setList((l) => l?.map((x) => (x.id === e.id ? { ...x, liked } : x)) ?? null);
    await setDoc(doc(fb.db, "sand", e.id), { liked }, { merge: true }).catch(() => {
      setError("하트를 남기지 못했어요. 관리자 계정으로 로그인했는지 확인해 주세요.");
      reload();
    });
  };

  const remove = async (id: string) => {
    setConfirm(null);
    await deleteDoc(doc(fb.db, "sand", id)).catch(() => setError("지우지 못했어요."));
    reload();
  };

  if (error) return <p className="mt-8 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!list) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  return (
    <div className="mt-8 grid gap-3">
      <p className="text-sm text-stone-500">
        <a href="/guest/" target="_blank" rel="noopener" className="underline">방명록(/guest)</a>에 새겨진 글이에요. 하트를 누르면 사이트에도 하트가 보여요.
      </p>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {list.length === 0 && <li className="p-5 text-stone-500">아직 새겨진 글이 없어요.</li>}
        {list.map((e) => (
          <li key={e.id} className="flex gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium text-stone-900">{e.n || "익명"}</span>
                <span className="ml-2 text-stone-400 tabular-nums">{when(e.at)}</span>
              </p>
              <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{e.t}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(e)}
              aria-pressed={!!e.liked}
              aria-label={e.liked ? "하트 취소" : "하트 남기기"}
              title={e.liked ? "하트 취소" : "하트 남기기"}
              className={`self-start grid place-items-center w-10 h-10 -my-1 rounded-full hover:bg-rose-50 ${e.liked ? "text-rose-600" : "text-stone-300 hover:text-rose-600"}`}
            >
              <HeartIcon filled={!!e.liked} size={26} />
            </button>
            {confirm === e.id ? (
              <span className="self-start flex items-center gap-3 text-sm">
                <button type="button" onClick={() => remove(e.id)} className="text-red-700 font-medium">
                  정말 삭제
                </button>
                <button type="button" onClick={() => setConfirm(null)} className="text-stone-500">
                  취소
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirm(e.id)} className="self-start text-sm text-stone-400 hover:text-red-700">
                삭제
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
