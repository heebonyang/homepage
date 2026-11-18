"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAlbumStock } from "../LimitedStock";
import { MUSIC_PROFILE } from "../music";
import { useSiteSettings } from "../siteSettings";
import { BRIDGE_SVG } from "./bridge";
import Concert from "./Concert";
import Live from "./Live";
import Lounge from "./Lounge";
import OrderForm from "./OrderForm";
import { DEFAULT_PAGE, imageSrc, usePage } from "./pageContent";
import "./home.css";

// 홈페이지 한 장 (예전 0집 페이지 heebonmd.web.app 와 합침)
// 광안대교 밤 그림 + 유튜브 라이브 카운트다운 → 양희본 0집(구매) → 음원 사이트 로고 → 공연(좌석 예매) → 라운지(공지·방명록) → 문의
// 문구는 관리자 '홈페이지 문구', 주문·예매는 '0집 주문'·'공연 예매'에서 관리.
export default function HomePage() {
  const loaded = usePage();
  const page = loaded ?? DEFAULT_PAGE;
  const stock = useAlbumStock();
  const artistLinks = (useSiteSettings()?.musicLinks ?? []).filter((l) => l.url);
  const soldOut = stock !== null && stock.stock <= 0;
  const [ordering, setOrdering] = useState(false);
  const [ticketing, setTicketing] = useState(false);

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
        </header>
        <div className="bridge" dangerouslySetInnerHTML={{ __html: BRIDGE_SVG }} />
        {/* 유튜브 로고를 누르면 바로 채널로. 매일 밤 10시 세로 라이브, 방송 시간에는 ON AIR */}
        <div className="liveline">
          <div className="wrap">
            <Live live={page.live} />
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

      {artistLinks.length > 0 && (
        <section className="listen" aria-label="음원 사이트">
          <div className="wrap">
                <ul className="artist-links" aria-label="아티스트 페이지">
                  {artistLinks.map((l) => (
                    <li key={l.url}>
                      <a href={l.url} target="_blank" rel="noopener" aria-label={`${l.name} 아티스트 페이지`} title={l.name}>
                        {l.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.logo} alt={l.name} />
                        ) : (
                          <span>{l.name}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
          </div>
        </section>
      )}

      <div className="deep">
        <Concert page={page} open={ticketing} setOpen={setTicketing} />
        <Lounge />
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

    </div>
  );
}
