"use client";
import { useState } from "react";
import { LETTER_MESSAGE_MAX, LETTER_NAME_MAX, LETTER_SONG_MAX, sendLetter, type LetterKind } from "../liveLetters";

// LIVE 칸 아래 '사연 · 신청곡 보내기' → 편지지 모양 입력칸. 관리자 '라이브 사연 · 신청곡'으로 감 (사이트에는 안 보임)
function Envelope({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  );
}

export default function LiveLetter() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<LetterKind>("story");
  const [song, setSong] = useState("");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (kind === "song" ? !song.trim() : !message.trim())) return;
    setStatus("sending");
    try {
      await sendLetter(kind, name.trim(), song.trim(), message.trim());
      setSong("");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (!open) {
    return (
      <button type="button" className="letter-open" onClick={() => setOpen(true)}>
        <Envelope />
        사연 · 신청곡 보내기
      </button>
    );
  }

  if (status === "sent") {
    return (
      <div className="letter letter-sent" role="status">
        <span className="letter-sent-icon">
          <Envelope size={30} />
        </span>
        <p className="serif">편지가 잘 도착했어요.</p>
        <small>오늘 밤 10시, 라이브에서 만나요 🌙</small>
        <button type="button" className="letter-again" onClick={() => setStatus("idle")}>
          한 통 더 쓰기
        </button>
      </div>
    );
  }

  return (
    <form className="letter" onSubmit={submit}>
      {/* 우표: 광안리 달 */}
      <span className="letter-stamp" aria-hidden>
        <svg viewBox="0 0 40 40" width="40" height="40">
          <circle cx="23" cy="16" r="8" fill="#F5C46B" />
          <circle cx="27" cy="13" r="7" fill="#15489E" />
          <path d="M4 30c4-3 8-3 12 0s8 3 12 0 8-3 8-3" stroke="#FEF7ED" strokeWidth="2" fill="none" />
        </svg>
      </span>
      <p className="letter-to serif">To. 양희본</p>

      <div className="letter-kind" role="radiogroup" aria-label="편지 종류">
        {(["story", "song"] as LetterKind[]).map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? "on" : ""} onClick={() => setKind(k)}>
            {k === "story" ? "사연" : "신청곡"}
          </button>
        ))}
      </div>

      {kind === "song" && (
        <input
          className="letter-line"
          aria-label="신청곡"
          placeholder="신청곡 (예: 곡 제목 - 가수)"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          maxLength={LETTER_SONG_MAX}
          required
        />
      )}
      <textarea
        className="letter-body"
        aria-label={kind === "song" ? "함께 전할 말" : "사연"}
        placeholder={kind === "song" ? "이 노래를 신청하는 이유, 함께 전하고 싶은 말 (선택)" : "오늘 있었던 일, 고민, 고마운 사람… 라이브에서 읽어 드려요"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        maxLength={LETTER_MESSAGE_MAX}
        rows={kind === "song" ? 3 : 6}
        required={kind === "story"}
      />

      <div className="letter-foot">
        <label className="letter-from serif">
          From.
          <input aria-label="보내는 사람" placeholder="이름 또는 닉네임" value={name} onChange={(e) => setName(e.target.value)} maxLength={LETTER_NAME_MAX} required />
        </label>
        <button type="submit" className="letter-send" disabled={status === "sending"}>
          <Envelope />
          {status === "sending" ? "보내는 중…" : "편지 보내기"}
        </button>
      </div>
      {status === "error" && <p className="letter-error">보내지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
      <button type="button" className="letter-close" onClick={() => setOpen(false)} aria-label="편지 접기">
        접기
      </button>
    </form>
  );
}
