// 메인 방명록(guestbook) 글을 광안리 모래 방명록(sand)으로 옮김 — 한 번만 돌리는 스크립트
// GitHub Actions 'Migrate guestbook → sand' 에서 서비스 계정으로 실행 (보안 규칙을 거치지 않는 관리자 권한)
//  - 글 번호(id)를 그대로 써서, 예전 비밀번호로도 지울 수 있게 비밀번호 해시(guestbookKeys → sandKeys)도 함께 옮김
//  - 날짜·이름·하트도 그대로. 모래 위 위치·기울기는 글 번호로 정해서 다시 돌려도 같음
//  - 이미 옮긴 글(sand 에 같은 번호가 있음)은 건너뜀. 원래 방명록은 지우지 않음
//  - DRY_RUN=1 이면 세기만 하고 쓰지 않음
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

// FIRESTORE_EMULATOR_HOST 가 있으면 테스트용 데이터베이스(에뮬레이터)에서 돌림
if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: "demo-test" });
else {
  const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const dry = process.env.DRY_RUN === "1";

// 글 번호로 0~1 사이 숫자 여러 개 (늘 같은 값)
function rand(id, k) {
  let x = 2166136261 ^ k;
  for (const c of id) x = Math.imul(x ^ c.charCodeAt(0), 16777619) >>> 0;
  x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

const posts = await db.collection("guestbook").get();
let moved = 0, skipped = 0, noKey = 0, long = 0;
for (const d of posts.docs) {
  const g = d.data();
  const target = db.collection("sand").doc(d.id);
  if ((await target.get()).exists) { skipped++; continue; }
  const key = await db.collection("guestbookKeys").doc(d.id).get();
  const t = String(g.message ?? "").trim();
  if (t.length > 30) long++;
  const data = {
    t,
    n: String(g.name ?? "").trim() || "익명",
    at: g.createdAt ?? new Date(),
    x: 0.14 + rand(d.id, 1) * 0.72,
    y: 0.18 + rand(d.id, 2) * 0.68,
    r: Math.round(rand(d.id, 3) * 8 - 4),
    ...(g.liked ? { liked: true } : {}),
  };
  if (!dry) {
    const b = db.batch();
    b.set(target, data);
    if (key.exists) b.set(db.collection("sandKeys").doc(d.id), { hash: key.data().hash });
    await b.commit();
  }
  if (!key.exists) noKey++;
  moved++;
}
// 내용·이름은 로그에 남기지 않고 개수만
console.log(`${dry ? "[미리보기] " : ""}방명록 글 ${posts.size}개 → 옮김 ${moved}, 이미 있어서 건너뜀 ${skipped}, 비밀번호 없는 글 ${noKey}, 30자 넘는 글 ${long}`);
