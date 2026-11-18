"use client";
import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, type Timestamp } from "firebase/firestore/lite";
import { getFirebase, type FirebaseServices } from "./firebase";

// 세로 라이브 사연 · 신청곡 (홈페이지 LIVE 칸의 편지 → 관리자 '라이브 사연 · 신청곡')
//   liveLetters/<자동 id> : { kind: "story" | "song", name, song, message, createdAt, read? }
// 보내기는 누구나, 읽기·표시·삭제는 관리자만 (firestore.rules). 사이트에는 보이지 않음
export type LetterKind = "story" | "song";
export type LiveLetter = { id: string; kind: LetterKind; name: string; song: string; message: string; createdAt: Timestamp | null; read?: boolean };

export const LETTER_NAME_MAX = 30;
export const LETTER_SONG_MAX = 100;
export const LETTER_MESSAGE_MAX = 1000;

export async function sendLetter(kind: LetterKind, name: string, song: string, message: string) {
  const fb = await getFirebase();
  if (!fb) throw new Error("unavailable");
  await addDoc(collection(fb.db, "liveLetters"), { kind, name, song: kind === "song" ? song : "", message, createdAt: serverTimestamp() });
}

export async function loadLetters(fb: FirebaseServices): Promise<LiveLetter[]> {
  const snap = await getDocs(query(collection(fb.db, "liveLetters"), orderBy("createdAt", "desc"), limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LiveLetter, "id">) }));
}

export const markLetter = (fb: FirebaseServices, id: string, read: boolean) => setDoc(doc(fb.db, "liveLetters", id), { read }, { merge: true });
export const deleteLetter = (fb: FirebaseServices, id: string) => deleteDoc(doc(fb.db, "liveLetters", id));

// ── 레파토리 (관리자만): 신청곡 중 들어 보고 연습할 곡을 모아 둠 ─────────────
//   repertoire/<곡 키> : { title, status, note, createdAt }
// 곡 키: 띄어쓰기·기호를 빼고 소문자로 ("Day 3 - 양희본" 과 "day3-양희본" 은 같은 곡)
export type RepStatus = "listen" | "practice" | "ready";
export const REP_STATUS: Record<RepStatus, string> = { listen: "들어볼 곡", practice: "연습 중", ready: "부를 수 있어요" };
export type RepSong = { id: string; title: string; status: RepStatus; note: string; createdAt: Timestamp | null };

export const songKey = (title: string) => title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "").slice(0, 120) || "song";

export async function loadRepertoire(fb: FirebaseServices): Promise<RepSong[]> {
  const snap = await getDocs(collection(fb.db, "repertoire"));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<RepSong, "id">) }));
}

export const addToRepertoire = (fb: FirebaseServices, title: string) =>
  setDoc(doc(fb.db, "repertoire", songKey(title)), { title: title.trim(), status: "listen", note: "", createdAt: serverTimestamp() }, { merge: true });
export const updateRepertoire = (fb: FirebaseServices, id: string, data: Partial<Pick<RepSong, "title" | "status" | "note">>) =>
  setDoc(doc(fb.db, "repertoire", id), data, { merge: true });
export const deleteRepertoire = (fb: FirebaseServices, id: string) => deleteDoc(doc(fb.db, "repertoire", id));
