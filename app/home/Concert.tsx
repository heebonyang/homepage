"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore/lite";
import { getFirebase } from "../firebase";
import { Agree, BankCopy, orderNo } from "./OrderForm";
import type { PageContent } from "./pageContent";

// 공연: 장소·시간·티켓 카드 + 좌석 배치도 + 좌석 예매서 (계좌이체)
// 예매는 tickets/{예매번호}, 고른 좌석은 concertSeats/{좌석} 에 한 번에 저장 → 같은 좌석을 두 사람이 잡을 수 없음 (firestore.rules)
// 분홍(예매 완료) = concertSeats + 관리자에서 직접 적은 '예매된 좌석'. 예매 목록은 관리자 '공연 예매'.
const MAX = 4;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

type Done = { no: string; seats: string; amount: string; depositor: string };

export default function Concert({ page, open, setOpen }: { page: PageContent; open: boolean; setOpen: (v: boolean) => void }) {
  const c = page.concert;
  const rows = Math.max(1, Math.min(20, Number(c.seatRows) || 5));
  const per = Math.max(2, Math.min(20, Number(c.seatsPerRow) || 10));
  const price = Number(c.ticketPrice) || 0;
  const ticketOpen = c.ticketOpen === true;

  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const manual = useMemo(
    () => new Set(String(c.bookedSeats || "").toUpperCase().split(/[\s,]+/).filter(Boolean)),
    [c.bookedSeats],
  );
  const isBooked = (k: string) => taken.has(k) || manual.has(k);

  const loadTaken = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) return new Set<string>();
    try {
      const snap = await getDocs(collection(fb.db, "concertSeats"));
      const t = new Set(snap.docs.map((d) => d.id));
      setTaken(t);
      return t;
    } catch {
      return new Set<string>();
    }
  }, []);

  useEffect(() => {
    loadTaken();
  }, [loadTaken]);

  const picking = open && !done;
  let bookedCount = 0;
  const half = Math.ceil(per / 2);
  const grid = Array.from({ length: rows }, (_, r) => {
    const L = String.fromCharCode(65 + r);
    return { L, seats: Array.from({ length: per }, (_, i) => `${L}${i + 1}`) };
  });
  grid.forEach((row) => row.seats.forEach((k) => isBooked(k) && bookedCount++));
  const total = rows * per;

  const toggle = (k: string) => {
    if (!picking || isBooked(k)) return;
    if (picked.includes(k)) return setPicked(picked.filter((x) => x !== k));
    if (picked.length >= MAX) return setError(`한 번에 최대 ${MAX}석까지 예매할 수 있어요.`);
    setError("");
    setPicked([...picked, k]);
  };

  const close = () => {
    setOpen(false);
    setPicked([]);
    setError("");
    setDone(null);
    document.getElementById("ticketBtn")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const name = v("name");
    const phone = v("phone").replace(/[\s.]/g, "");
    const depositor = v("depositor") || name;
    const memo = v("memo");
    const seats = [...picked].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    if (!seats.length) {
      document.getElementById("seatmap")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return setError("위 배치도에서 좌석을 하나 이상 골라 주세요.");
    }
    if (!name) return setError("이름을 적어 주세요.");
    if (!/^[0-9][0-9-]{8,13}$/.test(phone)) return setError("연락처를 숫자로 적어 주세요. (예: 010-1234-5678)");
    if (!f.get("agree")) return setError("개인정보 수집·이용에 동의해 주셔야 예매할 수 있어요.");
    setError("");
    setBusy(true);
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("offline");
      const no = `T${orderNo()}`;
      const batch = writeBatch(fb.db);
      batch.set(doc(fb.db, "tickets", no), {
        name,
        phone,
        seats,
        qty: seats.length,
        depositor,
        memo,
        status: "new",
        agree: true,
        createdAt: serverTimestamp(),
      });
      for (const s of seats) batch.set(doc(fb.db, "concertSeats", s), { ticket: no });
      await batch.commit();
      setTaken(new Set([...taken, ...seats]));
      setPicked([]);
      setDone({
        no,
        seats: seats.join(", "),
        amount: price ? `${won(seats.length * price)} (${seats.length}석)` : `${seats.length}석 · 금액은 따로 안내드려요`,
        depositor,
      });
      document.getElementById("ticket")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      const now = await loadTaken();
      const gone = seats.filter((k) => now.has(k));
      if (gone.length) {
        setPicked(picked.filter((k) => !now.has(k)));
        setError(`방금 다른 분이 예매한 좌석이 있어요: ${gone.join(", ")}. 다른 좌석을 골라 주세요.`);
      } else setError("예매를 넣지 못했어요. 입력한 내용(연락처 등)과 인터넷 연결을 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const btnHref = ticketOpen ? "#ticket" : c.ticketUrl || undefined;

  return (
    <section id="concert" className="band band-concert">
      <div className="wrap concert">
        <div className="kicker">CONCERT</div>
        <h2 className="serif pre">{c.headline}</h2>
        {c.description && (
          <p className="desc" style={{ maxWidth: 560 }}>
            {c.description}
          </p>
        )}
        <div className="cards">
          <div className="card">
            <div>장소</div>
            <div>{c.venue}</div>
          </div>
          <div className="card">
            <div>시간</div>
            <div>{c.time}</div>
          </div>
          <div className="card">
            <div>티켓</div>
            <div>{c.ticket}</div>
          </div>
        </div>

        <div className={`seatmap${picking ? " picking" : ""}`} id="seatmap">
          <div className="seat-head">
            <span>좌석 배치도</span>
            <span>
              전체 {total}석 · 예매 <b>{bookedCount}</b>석 · 남은 {total - bookedCount}석
            </span>
          </div>
          <div className="stage">STAGE</div>
          <div className="seats" role="group" aria-label={`좌석 배치도: 무대 앞 ${rows}줄, 전체 ${total}석 중 ${bookedCount}석 예매 완료`}>
            {grid.map((row) => (
              <div className="seat-row" key={row.L}>
                <span className="rl">{row.L}</span>
                {row.seats.map((k, i) => {
                  const b = isBooked(k);
                  const p = picked.includes(k);
                  return (
                    <span key={k} style={{ display: "contents" }}>
                      {i === half && <span className="aisle" />}
                      <button
                        type="button"
                        className={`seat${b ? " booked" : p ? " picked" : ""}`}
                        disabled={b || !picking}
                        tabIndex={picking ? 0 : -1}
                        aria-pressed={p}
                        aria-label={`${k}${b ? " 예매 완료" : p ? " 선택함" : ""}`}
                        title={`${k}${b ? " · 예매 완료" : ""}`}
                        onClick={() => toggle(k)}
                      />
                    </span>
                  );
                })}
                <span className="rl">{row.L}</span>
              </div>
            ))}
          </div>
          <div className="seat-legend">
            <span>
              <i className="seat" />
              예매 가능
            </span>
            {picking && (
              <span>
                <i className="seat picked" />
                선택한 좌석
              </span>
            )}
            <span>
              <i className="seat booked" />
              예매 완료
            </span>
          </div>
          {c.seatNote && <p className="seat-note">{c.seatNote}</p>}
        </div>

        {!open && (
          <>
            <a
              className="btn line"
              id="ticketBtn"
              href={btnHref}
              target={!ticketOpen && c.ticketUrl ? "_blank" : undefined}
              rel="noopener"
              style={btnHref ? { marginTop: 12 } : { marginTop: 12, opacity: 0.55, cursor: "default" }}
              onClick={(e) => {
                if (!ticketOpen) return;
                e.preventDefault();
                setOpen(true);
                setTimeout(() => document.getElementById("seatmap")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
              }}
            >
              {c.ticketButton}
            </a>
            {!ticketOpen && !c.ticketUrl && <p className="ticket-closed">예매가 열리면 이 자리에서 좌석을 골라 예매할 수 있어요.</p>}
          </>
        )}

        {open && (
          <div className="ticketbox" id="ticket">
            {done ? (
              <div className="done">
                <div className="kicker">SEE YOU THERE</div>
                <h3 className="serif">예매가 접수됐어요.</h3>
                <p>아래 계좌로 입금해 주시면, 확인 후 예매가 확정돼요.</p>
                <dl>
                  <dt>예매번호</dt>
                  <dd>{done.no}</dd>
                  <dt>좌석</dt>
                  <dd>{done.seats}</dd>
                  <dt>입금 금액</dt>
                  <dd>{done.amount}</dd>
                  <dt>입금자명</dt>
                  <dd>{done.depositor}</dd>
                  <dt>입금 계좌</dt>
                  <dd>
                    <BankCopy bank={page.order.bank} />
                  </dd>
                </dl>
                <p className="note">이 화면을 캡처해 두시면 편해요. 공연 당일 이름과 연락처로 확인해요.</p>
                <div className="actions">
                  <button type="button" className="btn ghost-close" onClick={close}>
                    닫기
                  </button>
                </div>
              </div>
            ) : (
              <form className="form" onSubmit={submit} noValidate>
                <div>
                  <label>
                    선택한 좌석 <small>위 배치도에서 눌러 골라 주세요 · 최대 {MAX}석</small>
                  </label>
                  <div className="picked-list" aria-live="polite">
                    {picked.length === 0
                      ? "아직 고른 좌석이 없어요."
                      : picked.map((k) => (
                          <span className="chip" key={k}>
                            {k}
                            <button type="button" aria-label={`${k} 선택 취소`} onClick={() => setPicked(picked.filter((x) => x !== k))}>
                              ×
                            </button>
                          </span>
                        ))}
                  </div>
                </div>
                <div className="two">
                  <div>
                    <label htmlFor="tName">이름</label>
                    <input type="text" id="tName" name="name" autoComplete="name" maxLength={30} required />
                  </div>
                  <div>
                    <label htmlFor="tPhone">연락처</label>
                    <input type="tel" id="tPhone" name="phone" autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" maxLength={14} required />
                  </div>
                </div>
                <div>
                  <label htmlFor="tDepositor">
                    입금자명 <small>예매자와 다를 때만</small>
                  </label>
                  <input type="text" id="tDepositor" name="depositor" maxLength={30} />
                </div>
                <div>
                  <label htmlFor="tMemo">
                    요청사항 <small>선택</small>
                  </label>
                  <textarea id="tMemo" name="memo" maxLength={300} />
                </div>
                <div className="total">
                  <span>입금하실 금액 {price > 0 && <small>(1석 {won(price)} × {picked.length}석)</small>}</span>
                  <b>{price ? won(picked.length * price) : "가격 미정"}</b>
                </div>
                <Agree
                  id="tAgree"
                  items={[
                    "수집 항목: 이름, 연락처, 입금자명, 요청사항",
                    "이용 목적: 입금 확인, 예매 확인, 공연 관련 연락",
                    "보관 기간: 공연이 끝난 뒤 1년 (법령에 따라 보관해야 하는 경우 그 기간)",
                    "동의하지 않으실 수 있지만, 이 경우 예매할 수 없어요.",
                  ]}
                />
                {error && (
                  <p className="err" role="alert">
                    {error}
                  </p>
                )}
                <div className="actions">
                  <button type="submit" className="btn" disabled={busy}>
                    {busy ? "예매 넣는 중…" : "예매하기"}
                  </button>
                  <button type="button" className="btn ghost-close" onClick={close}>
                    닫기
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
