"use client";
import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { getFirebase } from "../firebase";
import { imageSrc, type PageContent } from "./pageContent";

// 0집 CD 주문서 (계좌이체). orders 에 저장 → 관리자 '0집 주문'에서 확인. 저장 조건은 firestore.rules 의 orders 규칙.
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function orderNo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(5);
  crypto.getRandomValues(buf);
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Array.from(buf, (x) => abc[x % abc.length]).join("")}`;
}

export function BankCopy({ bank }: { bank: string }) {
  const [copied, setCopied] = useState(false);
  const acct = bank.match(/[0-9][0-9-]{5,}[0-9]/)?.[0];
  return (
    <>
      {bank}{" "}
      {acct && (
        <button
          type="button"
          className="linkbtn"
          onClick={() =>
            navigator.clipboard?.writeText(acct).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {copied ? "복사했어요" : "복사"}
        </button>
      )}
    </>
  );
}

type Done = { no: string; amount: string; depositor: string; sign: string };

export default function OrderForm({ page, stock, onClose }: { page: PageContent; stock: number | null; onClose: () => void }) {
  const unit = Number(page.order.unitPrice) || 10000;
  const maxQty = Math.max(1, Math.min(Number(page.order.maxQty) || 10, stock ?? 10));
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const name = v("name");
    const phone = v("phone").replace(/[\s.]/g, "");
    const address = v("address");
    const depositor = v("depositor") || name;
    const signName = v("signName");
    let memo = v("memo");
    if (!name) return setError("이름을 적어 주세요.");
    if (!/^[0-9][0-9-]{8,13}$/.test(phone)) return setError("연락처를 숫자로 적어 주세요. (예: 010-1234-5678)");
    if (address.length < 5) return setError("받는 주소를 적어 주세요.");
    if (!f.get("agree")) return setError("개인정보 수집·이용에 동의해 주셔야 주문할 수 있어요.");
    // 모든 CD에 사인. 사인에 이름을 넣고 싶으면 관리자 '0집 주문'에서 바로 보이도록 요청사항 맨 앞에 붙임
    if (signName) memo = (`[사인 이름: ${signName}]` + (memo ? `\n${memo}` : "")).slice(0, 300);
    setError("");
    setBusy(true);
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("offline");
      const no = orderNo();
      await setDoc(doc(fb.db, "orders", no), {
        name,
        phone,
        address,
        qty,
        depositor,
        memo,
        source: "shop",
        status: "new",
        agree: true,
        createdAt: serverTimestamp(),
      });
      setDone({
        no,
        amount: `${won(qty * unit)} (${qty}장)`,
        depositor,
        sign: `직접 사인해서 보내 드려요${signName ? ` (${signName} 님께)` : ""}`,
      });
      document.getElementById("order")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      setError(
        (err as { code?: string })?.code === "permission-denied"
          ? "주문을 넣지 못했어요. 입력한 내용(수량·연락처)을 확인해 주세요."
          : "주문을 넣지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="orderbox">
      <div className="orderhead">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageSrc(page.album.coverImage)} alt="" width={64} height={64} />
        <div>
          <div className="kicker">ORDER</div>
          <h2 className="serif">
            {page.hero.title} <span className="acc">{page.hero.titleAccent}</span> 주문서
          </h2>
          <div className="orderhead-price">{page.album.price}</div>
        </div>
      </div>

      {done ? (
        <div className="done">
          <div className="kicker">THANK YOU</div>
          <h3 className="serif">주문이 접수됐어요.</h3>
          <p>아래 계좌로 입금해 주시면, 확인 후 보내드릴게요.</p>
          <dl>
            <dt>주문번호</dt>
            <dd>{done.no}</dd>
            <dt>입금 금액</dt>
            <dd>{done.amount}</dd>
            <dt>입금자명</dt>
            <dd>{done.depositor}</dd>
            {done.sign && (
              <>
                <dt>사인</dt>
                <dd>{done.sign}</dd>
              </>
            )}
            <dt>입금 계좌</dt>
            <dd>
              <BankCopy bank={page.order.bank} />
            </dd>
          </dl>
          <p className="note">이 화면을 캡처해 두시면 편해요. 문의할 때 주문번호를 알려 주세요.</p>
          <div className="actions">
            <button type="button" className="btn ghost-close" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <div className="two">
            <div>
              <label htmlFor="oName">이름</label>
              <input type="text" id="oName" name="name" autoComplete="name" maxLength={30} required />
            </div>
            <div>
              <label htmlFor="oPhone">연락처</label>
              <input type="tel" id="oPhone" name="phone" autoComplete="tel" inputMode="tel" placeholder="010-1234-5678" maxLength={14} required />
            </div>
          </div>
          <div>
            <label htmlFor="oAddr">
              받는 주소 <small>우편번호가 있으면 함께 적어 주세요</small>
            </label>
            <textarea id="oAddr" name="address" autoComplete="street-address" maxLength={200} required />
          </div>
          <div className="two">
            <div>
              <label id="qtyLabel">수량</label>
              <div className="qty" role="group" aria-labelledby="qtyLabel">
                <button type="button" aria-label="한 장 빼기" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>
                  −
                </button>
                <output aria-live="polite">{qty}</output>
                <button type="button" aria-label="한 장 더하기" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}>
                  +
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="oDepositor">
                입금자명 <small>주문자와 다를 때만</small>
              </label>
              <input type="text" id="oDepositor" name="depositor" maxLength={30} />
            </div>
          </div>
          <div className="sign">
            <p className="sign-info">
              <b>모든 CD에 직접 사인해서 보내드려요</b>
              <span>사인을 위해 비닐을 뜯어서 보내드려요.</span>
            </p>
            <div>
              <label htmlFor="oSignName">
                사인에 넣을 이름 <small>선택 · 비워 두면 사인만 해 드려요</small>
              </label>
              <input type="text" id="oSignName" name="signName" maxLength={20} />
            </div>
          </div>
          <div>
            <label htmlFor="oMemo">
              요청사항 <small>선택</small>
            </label>
            <textarea id="oMemo" name="memo" maxLength={300} />
          </div>
          <div className="total">
            <span>
              입금하실 금액 {page.order.priceNote && <small>({page.order.priceNote})</small>}
            </span>
            <b>{won(qty * unit)}</b>
          </div>
          <Agree
            id="oAgree"
            items={[
              "수집 항목: 이름, 연락처, 주소, 입금자명, 요청사항",
              "이용 목적: 입금 확인, 음반 발송, 주문 관련 연락",
              "보관 기간: 발송 완료 후 1년 (법령에 따라 보관해야 하는 경우 그 기간)",
              "동의하지 않으실 수 있지만, 이 경우 주문할 수 없어요.",
            ]}
          />
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? "주문 넣는 중…" : "주문하기"}
            </button>
            <button type="button" className="btn ghost-close" onClick={onClose}>
              닫기
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function Agree({ id, items }: { id: string; items: string[] }) {
  return (
    <div className="agree">
      <input type="checkbox" id={id} name="agree" required />
      <div>
        <label htmlFor={id} className="agree-label">
          [필수] 개인정보 수집·이용에 동의해요
        </label>
        <details>
          <summary>자세히 보기</summary>
          <ul>
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
