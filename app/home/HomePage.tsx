"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAlbumStock } from "../LimitedStock";
import { MUSIC_PROFILE } from "../music";
import { SOCIAL } from "../SocialLinks";
import { BRIDGE_SVG } from "./bridge";
import Concert from "./Concert";
import Music from "./Music";
import News from "./News";
import OrderForm from "./OrderForm";
import { DEFAULT_PAGE, imageSrc, isOnAir, usePage } from "./pageContent";
import "./home.css";

// 홈페이지 한 장 (예전 0집 페이지 heebonmd.web.app 와 합침)
// 광안대교 밤 그림 + 오늘의 세로 라이브 → 양희본 0집(구매) → 발매곡 → 공연(좌석 예매) → 소식 → 문의
// 문구는 관리자 '홈페이지 문구', 주문·예매는 '0집 주문'·'공연 예매'에서 관리.
export default function HomePage() {
  const loaded = usePage();
  const page = loaded ?? DEFAULT_PAGE;
  const stock = useAlbumStock();
  const soldOut = stock !== null && stock.stock <= 0;
  const [ordering, setOrdering] = useState(false);
  const [ticketing, setTicketing] = useState(false);
  const [onAir, setOnAir] = useState(false);

  // 라이브 중 표시는 1분마다 다시 계산 (한국 시간 기준)
  useEffect(() => {
    const tick = () => setOnAir(isOnAir(page.live));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [page.live]);

  // 예전 주소(#order, #ticket)로 들어오면 해당 구역을 펼침
  useEffect(() => {
    if (!loaded) return;
    if (location.hash === "#order" && !soldOut) setOrdering(true);
    if (location.hash === "#ticket" && loaded.concert.ticketOpen) setTicketing(true);
    if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
  }, [loaded, soldOut]);

  const openOrder = () => {
    setOrdering(true);
    setTimeout(() => document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const closeOrder = () => {
    setOrdering(false);
    document.getElementById("buyBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const goConcert = () => {
    if (page.concert.ticketOpen) {
      setTicketing(true);
      setTimeout(() => document.getElementById("seatmap")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } else document.getElementById("concert")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const email = page.links.email || MUSIC_PROFILE.email;

  return (
    <div className="hb" style={{ ["--accent" as string]: page.accent || "#15489E" }}>
      <div className="top">
        <header className="topbar wrap">
          <Link
            className="brand"
            href="/"
            aria-label="양희본 HEEBON YANG, 처음으로"
            onClick={(e) => {
              e.preventDefault();
              history.replaceState(null, "", "/");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="ko">양희본</span>
            <span className="en">Heebon Yang</span>
          </Link>
          <span className="sns">
            <a href={SOCIAL.youtube} target="_blank" rel="noopener" aria-label="YouTube에서 보기" title="YouTube" className="yt">
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
                <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
                <path d="M10 9l5 3-5 3z" fill="#0D1230" />
              </svg>
            </a>
            <a href={SOCIAL.instagram} target="_blank" rel="noopener" aria-label="Instagram에서 보기" title="Instagram" className="ig">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </span>
        </header>
        <div className="bridge" dangerouslySetInnerHTML={{ __html: BRIDGE_SVG }} />
        {/* 오늘의 세로 라이브: 방송 시간에는 ON AIR */}
        <div className="liveline">
          <div className="wrap">
            <span className={`onair${onAir ? " on" : ""}`}>
              <i aria-hidden />
              {onAir ? "ON AIR" : "LIVE"}
            </span>
            <span className="live-label">{onAir ? "지금 유튜브에서 세로 라이브 중이에요" : page.live.label}</span>
            <a className="live-go" href={SOCIAL.youtube} target="_blank" rel="noopener">
              {onAir ? "지금 보기" : "유튜브 채널"} <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </div>

      <section id="album" className="album">
        <div className="wrap grid2">
          <div className="cover" style={page.album.coverImage ? { border: "none" } : undefined}>
            {page.album.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc(page.album.coverImage)} alt={`${page.album.title} 자켓`} />
            ) : (
              "[0집 자켓 이미지]"
            )}
          </div>
          <div className="col">
            <h1 className="serif">
              {page.hero.title} <span className="acc">{page.hero.titleAccent}</span>
            </h1>
            {page.hero.lead && <p className="lead pre">{page.hero.lead}</p>}
            {page.album.description && <p className="desc">{page.album.description}</p>}
            {page.album.tracklist && <div className="tracks pre">{page.album.tracklist}</div>}
            {page.album.hiddenTrack && <div className="hidden-track">{page.album.hiddenTrack}</div>}
            <div className="buy">
              <span className="price">{page.album.price}</span>
              {!soldOut && !ordering && (
                <button type="button" className="btn" id="buyBtn" onClick={openOrder}>
                  {page.album.buyButton}
                </button>
              )}
            </div>
            {soldOut && <p className="desc">준비한 음반이 모두 판매됐어요. 사랑해 주셔서 고맙습니다.</p>}
          </div>
        </div>
      </section>

      {ordering && !soldOut && (
        <section id="order" className="order" aria-label="주문서">
          <div className="wrap">
            <OrderForm page={page} stock={stock?.stock ?? null} onClose={closeOrder} />
          </div>
        </section>
      )}

      <Music />

      <div className="deep">
        <Concert page={page} open={ticketing} setOpen={setTicketing} />
        <News />
        <footer>
          <div className="wrap foot">
            <div className="foot-lights" aria-hidden />
            <div className="contact">
              <span className="home-k">CONTACT</span>
              <span className="contact-t">공연 · 협업 문의</span>
              <a href={`mailto:${email}`}>{email}</a>
            </div>
            <div className="foot-bottom">
              <span>© {new Date().getFullYear()} 양희본 · Busan, Gwangalli</span>
            </div>
          </div>
        </footer>
      </div>

      {/* 휴대폰: 화면 아래 고정 바로 바로 구매 · 예매 */}
      {!ordering && !ticketing && (
        <nav className="dock" aria-label="바로가기">
          {!soldOut && (
            <button type="button" onClick={openOrder}>
              CD 구매
            </button>
          )}
          <button type="button" onClick={goConcert}>
            {page.concert.ticketOpen ? "공연 예매" : "공연 안내"}
          </button>
        </nav>
      )}
    </div>
  );
}
