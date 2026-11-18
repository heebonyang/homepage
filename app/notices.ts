"use client";
import { collection, getDocs, Timestamp } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

export type Notice = {
  id?: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Timestamp | null;
};

// 데이터베이스에 공지가 없거나 연결할 수 없을 때 보여주는 공지
// (관리자 페이지의 '기존 내용 가져오기'로 데이터베이스에 옮길 수 있음)
export const STATIC_NOTICES: Notice[] = [
  {
    title: "홈페이지를 열었습니다",
    body: "새 소식과 공연 일정을 이곳에서 전할게요. 방명록에도 편하게 글 남겨 주세요.",
    pinned: false,
    createdAt: null,
  },
];

// 고정 공지를 맨 위에, 나머지는 최신순
export const sortNotices = (list: Notice[]) =>
  [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );

// showStaticWhenEmpty: 데이터베이스에 공지가 없으면 위 공지를 대신 보여줌
export async function loadNotices({ showStaticWhenEmpty = true } = {}): Promise<{ notices: Notice[]; remote: boolean }> {
  const fallback = { notices: STATIC_NOTICES, remote: false };
  const fb = await getFirebase();
  if (!fb) return fallback;
  try {
    const snap = await getDocs(collection(fb.db, "notices"));
    if (showStaticWhenEmpty && snap.empty) return fallback;
    return { notices: sortNotices(snap.docs.map((d) => ({ ...(d.data() as Notice), id: d.id }))), remote: true };
  } catch {
    return fallback;
  }
}
