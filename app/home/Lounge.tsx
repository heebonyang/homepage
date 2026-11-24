"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, type Timestamp } from "firebase/firestore/lite";
import { getFirebase } from "../firebase";

// 방명록: 공연 아래 크림색 판. 새 방명록(/guest, 광안리 모래사장)의 최근 글 몇 개를 보여 주고 '방명록 가기'로 연결.
// 글 쓰기·지우기·지난 글은 /guest 에서. (예전 방명록 guestbook 은 관리자 '예전 방명록'에 그대로 있음)
type SandEntry = { id: string; t: string; n: string; at: Timestamp | null; liked?: boolean };
const SHOW = 3;

function md(ts: Timestamp | null) {
  const d = ts?.toDate?.();
  return d ? `${d.getMonth() + 1}/${d.getDate()}` : "";
}

export default function Lounge() {
  const [list, setList] = useState<SandEntry[] | null>(null);

  useEffect(() => {
    (async () => {
      const fb = await getFirebase();
      if (!fb) return setList([]);
      const s = await getDocs(query(collection(fb.db, "sand"), orderBy("at", "desc"), limit(SHOW)));
      setList(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SandEntry, "id">) })));
    })().catch(() => setList([]));
  }, []);

  return (
    <section id="lounge" className="lounge">
      <div className="wrap">
        <div className="lounge-panel">
          <div className="kicker">GUESTBOOK</div>
          <h2 className="serif lounge-title">방명록</h2>
          <p className="gb-lead">광안리 모래사장에 한 줄을 새겨 주세요.</p>
          <ul className="gb-sand" aria-busy={list === null}>
            {(list ?? []).map((e) => (
              <li key={e.id}>
                <span className="gb-text">{e.t}</span>
                <span className="gb-who">
                  {e.liked && (
                    <span className="gb-heart" aria-label="양희본의 하트">
                      ♥
                    </span>
                  )}
                  — {e.n || "익명"} <small>{md(e.at)}</small>
                </span>
              </li>
            ))}
          </ul>
          <a className="gb-go" href="/guest/">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" />
              <path d="M14.5 5.5l3 3" />
            </svg>
            방명록 가기
          </a>
        </div>
      </div>
    </section>
  );
}
