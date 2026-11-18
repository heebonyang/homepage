import type { Metadata } from "next";
import { Gowun_Batang, Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 명함과 같은 글꼴: 영문·숫자는 Inter, 한글은 Noto Sans KR
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const notoKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-noto-kr" });
// 제목·숫자용 명조 (홈페이지 0집·공연 구역)
const gowun = Gowun_Batang({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false, variable: "--font-gowun" });

export const metadata: Metadata = {
  title: "양희본",
  description: "양희본 0집 CD · 매일 밤 유튜브 세로 라이브 · 2027년 3월 27일 부산 공연",
  metadataBase: new URL("https://heebonyang.web.app"),
  // 링크를 카톡·인스타에 붙였을 때 보이는 썸네일: 0집 자켓
  openGraph: {
    title: "양희본",
    description: "양희본 0집 CD · 매일 밤 유튜브 세로 라이브 · 2027년 3월 27일 부산 공연",
    images: ["/images/album0.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoKr.variable} ${gowun.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
