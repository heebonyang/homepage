"use client";
import { collection, doc, getDocs, increment, setDoc } from "firebase/firestore/lite";
import { getFirebase, type FirebaseServices } from "./firebase";

// 음원 사이트 로고를 누른 횟수를 달마다 셈 (관리자 '링크'에서 확인).
//   linkClicks/<YYYY-MM>_<이름>  : { name, month, count }
// 누구나 1씩만 늘릴 수 있고, 읽기는 관리자만 (firestore.rules)

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 30) || "link";

// 한국 시간 기준 이번 달 "2026-11"
export const thisMonth = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 7);

export function recordClick(name: string) {
  const month = thisMonth();
  getFirebase()
    .then((fb) => fb && setDoc(doc(fb.db, "linkClicks", `${month}_${slug(name)}`), { name: name.slice(0, 40), month, count: increment(1) }, { merge: true }))
    .catch(() => {});
}

// 이름별 { 이번 달, 전체 }
export async function loadClicks(fb: FirebaseServices): Promise<Record<string, { month: number; total: number }>> {
  const now = thisMonth();
  const out: Record<string, { month: number; total: number }> = {};
  const snap = await getDocs(collection(fb.db, "linkClicks"));
  for (const d of snap.docs) {
    const { name, month, count } = d.data() as { name: string; month: string; count: number };
    const k = slug(name);
    out[k] ??= { month: 0, total: 0 };
    out[k].total += count || 0;
    if (month === now) out[k].month += count || 0;
  }
  return out;
}

export const clickKey = slug;
