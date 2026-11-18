"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore/lite";
import { getFirebase } from "../firebase";

// 홈페이지 문구 (관리자 '홈페이지 문구'에서 고침 → Firestore settings/albumPage).
// 저장된 값이 없거나 빠진 칸은 아래 처음 값으로 채움.
export type PageContent = {
  accent: string;
  live: { label: string; start: string; minutes: number };
  hero: { title: string; titleAccent: string; lead: string };
  album: {
    title: string;
    description: string;
    tracklist: string;
    hiddenTrack: string;
    price: string;
    buyButton: string;
    coverImage: string;
  };
  order: { unitPrice: number; priceNote: string; maxQty: number; bank: string };
  concert: {
    headline: string;
    description: string;
    venue: string;
    time: string;
    ticket: string;
    ticketUrl: string;
    ticketButton: string;
    seatRows: number;
    seatsPerRow: number;
    bookedSeats: string;
    seatNote: string;
    ticketOpen: boolean;
    ticketPrice: number;
  };
  links: { email: string };
};

export const DEFAULT_PAGE: PageContent = {
  accent: "#15489E",
  live: { label: "매일 밤 10시 ~ 11시, 세로 라이브", start: "22:00", minutes: 60 },
  hero: { title: "양희본", titleAccent: "0집", lead: "발라드와 모던록, 포크 사이 어딘가.\n조용히, 끝까지 들어야 하는 노래들." },
  album: {
    title: "양희본 0집",
    description: "첫 번째보다 앞에 있는 음반. 손으로 만지고, 처음부터 끝까지 들을 수 있는 실물 음반으로 만나보세요.",
    tracklist: "[수록곡 목록]",
    hiddenTrack: "어디에서도 들을 수 없는 히든 트랙 1곡 수록",
    price: "10,000원 · 택배비 포함",
    buyButton: "음반 구매하기",
    coverImage: "/images/album0.jpg",
  },
  order: { unitPrice: 10000, priceNote: "택배비 포함", maxQty: 10, bank: "신한은행 957-06-111158 양희본" },
  concert: {
    headline: "2027. 03. 27 토요일\n부산에서.",
    description: "0집의 노래들을 무대에서 직접 부릅니다.",
    venue: "[공연장]",
    time: "[공연 시간]",
    ticket: "[티켓 가격]",
    ticketUrl: "",
    ticketButton: "예매 알림 받기",
    seatRows: 5,
    seatsPerRow: 10,
    bookedSeats: "",
    seatNote: "공연장이 정해지면 실제 배치로 바뀌어요.",
    ticketOpen: false,
    ticketPrice: 0,
  },
  links: { email: "" },
};

export const PAGE_DOC = ["settings", "albumPage"] as const;

// 처음 값 위에 저장된 값을 칸별로 덮어씀 (구역 단위로 한 단계만)
export function mergePage(saved: Record<string, unknown> | undefined): PageContent {
  const out = JSON.parse(JSON.stringify(DEFAULT_PAGE)) as Record<string, unknown>;
  for (const [k, v] of Object.entries(saved ?? {})) {
    const base = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base && typeof base === "object") out[k] = { ...base, ...v };
    else if (v != null && k in out) out[k] = v;
  }
  return out as PageContent;
}

// 예전 0집 페이지 기준 상대 주소(images/album0.jpg)도 홈페이지에서 보이도록
export const imageSrc = (v: string) => (/^(data:|https?:|\/)/.test(v) ? v : `/${v}`);

export async function loadPage(): Promise<PageContent> {
  const fb = await getFirebase();
  if (!fb) return DEFAULT_PAGE;
  try {
    return mergePage((await getDoc(doc(fb.db, ...PAGE_DOC))).data());
  } catch {
    return DEFAULT_PAGE;
  }
}

export function usePage() {
  const [page, setPage] = useState<PageContent | null>(null);
  useEffect(() => {
    loadPage().then(setPage);
  }, []);
  return page;
}

