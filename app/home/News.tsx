"use client";
import { useEffect, useState } from "react";
import { loadNotices, type Notice } from "../notices";
import { useSiteSettings } from "../siteSettings";

// 소식(공지): 제목만 보이고 누르면 펼쳐짐. 관리자 '공지'에서 고침. 없으면 구역을 숨김.
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

function day(n: Notice) {
  const d = n.createdAt?.toDate?.();
  return d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}` : "";
}

export default function News() {
  const settings = useSiteSettings();
  const [notices, setNotices] = useState<Notice[] | null>(null);

  useEffect(() => {
    if (!settings) return;
    loadNotices({ showStaticWhenEmpty: !settings.noticesInDb }).then((r) => setNotices(r.notices.slice(0, 5)));
  }, [settings]);

  if (!notices || notices.length === 0) return null;

  return (
    <section id="news" className="news">
      <div className="wrap">
        <div className="kicker">NEWS</div>
        <ul>
          {notices.map((n, i) => (
            <li key={n.id ?? i}>
              <details>
                <summary>
                  <span>{n.title}</span>
                  <small>{day(n)}</small>
                </summary>
                <p className="pre">
                  <Linkified text={n.body} />
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
