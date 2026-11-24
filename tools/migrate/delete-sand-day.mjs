// 모래 방명록(sand)에서 특정 날짜(한국 시간)에 새겨진 글을 지움 — 손으로 한 번 돌리는 스크립트
//   DAY=2026-11-24  DRY_RUN=1 이면 세기만 함
//   RESET_STEPS=1 이면 발자국 수도 0 으로 (SKIP_SAND=1 이면 글은 건드리지 않음)
// 메인 방명록에서 옮겨 온 글(guestbook 에 같은 번호가 있는 글)은 따로 세어 알려 주고, KEEP_MIGRATED=1 이면 지우지 않음
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync } from "node:fs";

if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: "demo-test" });
else {
  const sa = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const day = process.env.DAY;
if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? "")) throw new Error("DAY=YYYY-MM-DD 가 필요해요");
const dry = process.env.DRY_RUN === "1";
const keepMigrated = process.env.KEEP_MIGRATED === "1";

const start = new Date(`${day}T00:00:00+09:00`), end = new Date(start.getTime() + 86400000);
const snap = await db.collection("sand").where("at", ">=", Timestamp.fromDate(start)).where("at", "<", Timestamp.fromDate(end)).get();
let fromGuest = 0, removed = 0;
for (const d of snap.docs) {
  const migrated = (await db.collection("guestbook").doc(d.id).get()).exists;
  if (migrated) fromGuest++;
  if (migrated && keepMigrated) continue;
  if (!dry) {
    const b = db.batch();
    b.delete(d.ref);
    b.delete(db.collection("sandKeys").doc(d.id));
    b.delete(db.collection("sandUnlock").doc(d.id));
    await b.commit();
  }
  removed++;
}
// RESET_STEPS=1 이면 발자국 수(sandSteps) 문서를 모두 지움 → 0 부터 다시 셈
if (process.env.RESET_STEPS === "1") {
  const steps = await db.collection("sandSteps").get();
  if (!dry) for (const d of steps.docs) await d.ref.delete();
  console.log(`${dry ? "[미리보기] " : ""}발자국 수 문서 ${steps.size}개 지움 (${steps.docs.map((d) => `${d.id}: ${d.data().count}`).join(", ")})`);
}
if (process.env.SKIP_SAND === "1") process.exit(0);
console.log(`${dry ? "[미리보기] " : ""}${day} 모래 방명록 글 ${snap.size}개 (메인 방명록에서 옮겨 온 글 ${fromGuest}개) → 지움 ${removed}`);
