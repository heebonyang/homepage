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
