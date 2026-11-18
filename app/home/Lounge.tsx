"use client";
import Guestbook from "../Guestbook";

// 오늘 밤 한마디: 라이브에서 읽어 줄 사연·신청곡 (예전 방명록, 관리자 '오늘 밤 한마디'에서 관리)
export default function Lounge() {
  return (
    <section id="lounge" className="lounge">
      <div className="wrap">
        <div className="lounge-panel">
          <div className="kicker">TONIGHT</div>
          <h2 className="serif lounge-title">오늘 밤, 한마디</h2>
          <p className="mt-2 text-[15px] text-stone-500">남겨 주신 사연과 신청곡은 밤 10시 세로 라이브에서 읽어 드려요.</p>
          <div className="mt-6">
            <Guestbook />
          </div>
        </div>
      </div>
    </section>
  );
}
