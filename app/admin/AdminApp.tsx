"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { deleteDoc, doc, setDoc } from "firebase/firestore/lite";
import { getFirebase, type FirebaseServices } from "../firebase";
import LiveLettersManager from "./LiveLettersManager";
import OrdersManager from "./OrdersManager";
import SandManager from "./SandManager";
import AlbumPageEditor from "./AlbumPageEditor";
import TicketsManager from "./TicketsManager";
import { formatDate, HeartIcon, loadGuestbook, type GuestbookEntry } from "../Guestbook";
import { clickKey, loadClicks, thisMonth } from "../linkClicks";
import { loadSettings, SETTINGS_DOC, type MusicLink } from "../siteSettings";

type Section = "links" | "album" | "albumPage" | "orders" | "tickets" | "letters" | "sand" | "guestbook";

const SECTION_LABELS: Record<Section, string> = { links: "링크", album: "0집 CD", albumPage: "홈페이지 문구", orders: "0집 주문", tickets: "공연 예매", letters: "사연 · 신청곡 · 레파토리", sand: "방명록", guestbook: "예전 방명록" };

function errorMessage(e: unknown) {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied") return "이 계정에는 저장 권한이 없어요. 관리자 구글 계정으로 로그인했는지 확인해 주세요.";
  return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:outline-none focus:border-stone-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 min-w-0">
      <span className="text-sm text-stone-600">
        {label}
        {hint && <span className="ml-2 text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

// 0집 CD 남은 수량 / 전체 수량. 사이트에는 숫자가 보이지 않고, 품절 표시와 주문 가능 수량에만 쓰임
function AlbumStockEditor({ fb }: { fb: FirebaseServices }) {
  const [stock, setStock] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => {
      setStock(String(s.albumStock));
      setTotal(String(s.albumTotal));
    });
  }, []);

  if (stock === null) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const stockNum = Number(stock);
  const totalNum = Number(total);
  const valid =
    Number.isInteger(stockNum) && Number.isInteger(totalNum) && stockNum >= 0 && totalNum > 0 && stockNum <= totalNum;

  const change = (value: string) => {
    setStock(value);
    setStatus("idle");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setStatus("saving");
    try {
      await setDoc(doc(fb.db, ...SETTINGS_DOC), { albumStock: stockNum, albumTotal: totalNum }, { merge: true });
      loadSettings({ fresh: true });
      setStatus("saved");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm text-stone-500">이 숫자는 사이트에 보이지 않아요. 주문을 이 수량까지만 받고, 0이 되면 홈페이지에 품절로 표시돼요.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="남은 수량" hint="장">
          <input
            id="album-stock"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => change(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field label="전체 수량 (한정판)" hint="장">
          <input
            id="album-total"
            type="number"
            min={1}
            value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              setStatus("idle");
            }}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>
      {!valid && <p className="text-sm text-red-700">남은 수량은 0 이상, 전체 수량 이하의 정수로 입력해 주세요.</p>}
      <div className="flex items-center justify-end gap-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 사이트에 바로 반영돼요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <button
          type="submit"
          disabled={!valid || status === "saving"}
          className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50"
        >
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 로고는 높이 최대 120px PNG로 줄여서 저장 (투명 배경 유지)
const LOGO_HEIGHT = 120;

function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, LOGO_HEIGHT / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    img.src = URL.createObjectURL(file);
  });
}

const emptyLink = (): MusicLink => ({ name: "", url: "" });

function LinkEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: MusicLink;
  onSave: (link: MusicLink) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<MusicLink>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      setDraft((d) => ({ ...d, logo: undefined }));
      const logo = await resizeLogo(file);
      setDraft((d) => ({ ...d, logo }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim(), url: draft.url.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="이름" hint="예: Melon, Spotify">
          <input id="link-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="링크 주소">
          <input
            id="link-url"
            type="url"
            required
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-sm text-stone-600">
          로고 이미지 <span className="ml-2 text-stone-400">선택 · 투명 배경 PNG 추천. 없으면 이름 글자로 표시돼요</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid place-items-center h-16 min-w-32 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4">
            {draft.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logo} alt="로고 미리보기" className="h-8 w-auto" />
            ) : (
              <span className="text-sm text-stone-400">로고 없음</span>
            )}
          </div>
          <label className="text-sm px-4 py-2 rounded-lg border border-stone-300 cursor-pointer hover:border-stone-900">
            {draft.logo ? "다른 이미지로 바꾸기" : "이미지 선택"}
            <input
              id="link-logo"
              type="file"
              accept="image/png,image/*"
              className="sr-only"
              onChange={(e) => pickLogo(e.target.files?.[0])}
            />
          </label>
          {draft.logo && (
            <a href={draft.logo} download={logoFileName(draft.name, draft.logo)} className="text-sm text-stone-700 hover:underline">
              로고 받기
            </a>
          )}
          {draft.logo && (
            <button type="button" onClick={() => setDraft({ ...draft, logo: undefined })} className="text-sm text-stone-500 hover:text-red-700">
              로고 지우기
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
          취소
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 음악 탭 머리글 오른쪽 바로가기 관리 (멜론 등). 목록 전체를 settings/site 문서에 저장
// 저장된 로고(data URL)를 파일로 내려받을 때 쓸 이름: "Melon-로고.png"
function logoFileName(name: string, dataUrl: string) {
  const ext = (dataUrl.match(/^data:image\/([a-z0-9+]+)/i)?.[1] ?? "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  return `${(name || "logo").replace(/[\\/:*?"<>|\s]+/g, "_")}-로고.${ext}`;
}

function LinksManager({ fb }: { fb: FirebaseServices }) {
  const [links, setLinks] = useState<MusicLink[] | null>(null);
  const [editing, setEditing] = useState<{ index: number | null; value: MusicLink } | null>(null);
  const [notice, setNotice] = useState("");
  // 사이트에서 로고를 누른 횟수 (이름별 이번 달 · 전체)
  const [clicks, setClicks] = useState<Record<string, { month: number; total: number }> | null>(null);

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => setLinks(s.musicLinks));
    loadClicks(fb).then(setClicks).catch(() => setClicks({}));
  }, [fb]);

  const saveAll = async (next: MusicLink[], message: string) => {
    // undefined 값은 저장할 수 없어서 로고가 없으면 필드를 빼고 저장
    const clean = next.map(({ name, url, logo }) => (logo ? { name, url, logo } : { name, url }));
    await setDoc(doc(fb.db, ...SETTINGS_DOC), { musicLinks: clean }, { merge: true });
    setLinks(clean);
    setEditing(null);
    setNotice(message);
    loadSettings({ fresh: true });
  };

  if (!links) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    saveAll(next, "순서를 바꿨어요.").catch((e) => setNotice(errorMessage(e)));
  };

  return (
    <div className="mt-8 grid gap-6">
      <p className="text-sm text-stone-500">
        음악 탭 맨 위 한 줄 소개 오른쪽에 보이는 로고 링크예요. 평소엔 회색이고, 마우스를 올리면 원래 색으로 보여요.
      </p>
      {notice && <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p>}
      {editing ? (
        <LinkEditor
          key={editing.index ?? "new"}
          initial={editing.value}
          onCancel={() => setEditing(null)}
          onSave={(link) => {
            const next = [...links];
            if (editing.index === null) next.push(link);
            else next[editing.index] = link;
            return saveAll(next, `'${link.name}' 링크를 저장했어요.`);
          }}
        />
      ) : (
        <button
          onClick={() => setEditing({ index: null, value: emptyLink() })}
          className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm"
        >
          + 새 링크 추가
        </button>
      )}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {links.length === 0 && <li className="p-5 text-stone-500">링크가 없어요. 홈페이지 STREAMING 칸에도 로고가 보이지 않아요.</li>}
        {links.map((link, i) => (
          <li key={i} className="flex items-center gap-4 p-4">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${link.name} 앞으로`} className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25">
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === links.length - 1}
                aria-label={`${link.name} 뒤로`}
                className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25"
              >
                ▼
              </button>
            </div>
            <div className="grid place-items-center h-12 w-24 shrink-0 rounded-lg bg-stone-50">
              {link.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.logo} alt={link.name} className="h-7 w-auto" />
              ) : (
                <span className="text-xs text-stone-400">로고 없음</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900">{link.name}</p>
              <p className="text-sm text-stone-500 truncate">{link.url}</p>
              <p className="mt-1 text-xs text-stone-500 tabular-nums">
                {clicks === null
                  ? "누른 횟수 불러오는 중…"
                  : `${thisMonth().slice(5).replace(/^0/, "")}월에 ${clicks[clickKey(link.name)]?.month ?? 0}번 · 지금까지 ${clicks[clickKey(link.name)]?.total ?? 0}번 눌렸어요`}
              </p>
            </div>
            {link.logo && (
              <a href={link.logo} download={logoFileName(link.name, link.logo)} className="text-sm text-stone-700 hover:underline">
                로고 받기
              </a>
            )}
            <button onClick={() => setEditing({ index: i, value: link })} className="text-sm text-stone-700 hover:underline">
              수정
            </button>
            <ConfirmButton
              label="삭제"
              onConfirm={() =>
                saveAll(
                  links.filter((_, k) => k !== i),
                  `'${link.name}' 링크를 삭제했어요.`,
                ).catch((e) => setNotice(errorMessage(e)))
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// 삭제처럼 되돌릴 수 없는 동작은 한 번 더 눌러야 실행되게 함 (브라우저 확인창 대신)
function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className="text-sm text-stone-500 hover:text-red-700">
        {label}
      </button>
    );
  }
  return (
    <span className="flex gap-2 text-sm">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
          setArmed(false);
        }}
        className="text-red-700 font-medium"
      >
        정말 {label}
      </button>
      <button onClick={() => setArmed(false)} className="text-stone-500">
        취소
      </button>
    </span>
  );
}

function Dashboard({ fb }: { fb: FirebaseServices }) {
  const [section, setSection] = useState<Section>("orders");
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    const entries = await loadGuestbook();
    // 방명록을 못 불러오면(null) 데이터베이스 연결 문제
    setLoadError(entries === null);
    setGuestbook(entries ?? []);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const done = async (message: string) => {
    setNotice(message);
    await reload();
  };

  // 방명록 하트: 관리자만 남기고 취소할 수 있음 (firestore.rules 에서 liked 칸만 바꿀 수 있게 막음)
  const toggleHeart = async (g: GuestbookEntry) => {
    const liked = !g.liked;
    setGuestbook((list) => list.map((x) => (x.id === g.id ? { ...x, liked } : x)));
    try {
      await setDoc(doc(fb.db, "guestbook", g.id), { liked }, { merge: true });
    } catch (e) {
      setGuestbook((list) => list.map((x) => (x.id === g.id ? { ...x, liked: g.liked } : x)));
      setNotice(errorMessage(e));
    }
  };

  const remove = async (path: string, id: string, label: string) => {
    try {
      await deleteDoc(doc(fb.db, path, id));
      await done(`${label}을(를) 삭제했어요.`);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  if (loadError) {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
        데이터베이스에 연결하지 못했어요. Firebase 콘솔에서 Firestore 데이터베이스가 만들어져 있는지 확인해 주세요.
      </p>
    );
  }

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 p-1 w-fit rounded-full border border-stone-200 bg-white text-sm">
        {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={section === s}
            onClick={() => {
              setSection(s);
              setNotice("");
            }}
            className={`px-4 py-1.5 rounded-full ${section === s ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {notice && <p className="mt-6 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p>}

      {section === "links" && <LinksManager fb={fb} />}

      {section === "album" && <AlbumStockEditor fb={fb} />}

      {section === "albumPage" && <AlbumPageEditor fb={fb} />}

      {section === "orders" && <OrdersManager fb={fb} />}

      {section === "letters" && <LiveLettersManager fb={fb} />}

      {section === "sand" && <SandManager fb={fb} />}

      {section === "tickets" && <TicketsManager fb={fb} />}

      {section === "guestbook" && (
        <ul className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {guestbook.length === 0 && <li className="p-5 text-stone-500">아직 방명록 글이 없어요.</li>}
          {guestbook.map((g) => (
            <li key={g.id} className="flex gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium text-stone-900">{g.name}</span>
                  <span className="ml-2 text-stone-400 tabular-nums">{formatDate(g.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{g.message}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleHeart(g)}
                aria-pressed={!!g.liked}
                aria-label={g.liked ? "하트 취소" : "하트 남기기"}
                title={g.liked ? "하트 취소" : "하트 남기기"}
                className={`self-start grid place-items-center w-10 h-10 -my-1 rounded-full hover:bg-rose-50 ${g.liked ? "text-rose-600" : "text-stone-300 hover:text-rose-600"}`}
              >
                <HeartIcon filled={!!g.liked} size={26} />
              </button>
              <ConfirmButton label="삭제" onConfirm={() => remove("guestbook", g.id, "방명록 글")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminApp() {
  // undefined: 확인 중 / null: Firebase에 연결할 수 없음
  const [fb, setFb] = useState<FirebaseServices | null | undefined>(undefined);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    getFirebase().then((services) => {
      setFb(services);
      if (services) unsubscribe = onAuthStateChanged(getAuth(services.app), setUser);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!fb) return;
    setLoginError("");
    try {
      await signInWithPopup(getAuth(fb.app), new GoogleAuthProvider());
    } catch {
      setLoginError("로그인하지 못했어요. 팝업 차단을 해제하고 다시 시도해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="font-bold text-stone-900">관리자</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-stone-500 hover:text-stone-900">
              사이트 보기
            </Link>
            {fb && user && (
              <button onClick={() => signOut(getAuth(fb.app))} className="text-stone-500 hover:text-stone-900">
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {fb === undefined || (fb && user === undefined) ? (
          <p className="text-stone-400">불러오는 중…</p>
        ) : fb === null ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
            Firebase 설정을 찾지 못했어요. 배포된 사이트(heebonyang.web.app/admin)에서 열어 주세요.
          </p>
        ) : !user ? (
          <div className="max-w-sm mx-auto mt-16 text-center">
            <h1 className="text-2xl font-bold text-stone-900">관리자 로그인</h1>
            <p className="mt-3 text-stone-500">관리자 구글 계정으로 로그인해 주세요.</p>
            <button onClick={login} className="mt-8 px-6 py-3 rounded-full bg-stone-900 text-white">
              Google 계정으로 로그인
            </button>
            {loginError && <p className="mt-4 text-sm text-red-700">{loginError}</p>}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-stone-500">{user.email} 계정으로 로그인했어요.</p>
            <Dashboard fb={fb} />
          </>
        )}
      </main>
    </div>
  );
}
