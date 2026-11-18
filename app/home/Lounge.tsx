"use client";
import Guestbook from "../Guestbook";

// 방명록: 공연 아래 크림색 판 위에 (관리자 '방명록'에서 관리).
// 예전 '라운지'(공지 · 방명록)를 방명록 하나로 줄임. 공지 데이터는 데이터베이스에 그대로 있음
export default function Lounge() {
  return (
    <section id="lounge" className="lounge">
      <div className="wrap">
        <div className="lounge-panel">
          <div className="kicker">GUESTBOOK</div>
          <h2 className="serif lounge-title">방명록</h2>
          <div className="mt-5">
            <Guestbook />
          </div>
        </div>
      </div>
    </section>
  );
}
