import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const SESSION_COOKIE_NAME = "gkjw_session";

function getAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!projectId || !clientEmail || !privateKey) throw new Error("Firebase admin credentials are not configured.");
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
  }
  return getApps()[0];
}

function getSessionCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))?.slice(SESSION_COOKIE_NAME.length + 1);
}

export async function POST(request: Request) {
  try {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) return NextResponse.json({ ok: false, error: "Sesi login tidak ditemukan." }, { status: 401 });
    await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true);

    const formData = await request.formData();
    const file = formData.get("file");
    const purpose = formData.get("purpose");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "File tidak ditemukan." }, { status: 400 });
    if (purpose !== "article-media" && purpose !== "article-document") return NextResponse.json({ ok: false, error: "Tujuan upload tidak valid." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: "Ukuran file harus antara 1 byte dan 10 MB." }, { status: 413 });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const gasUrl = process.env.GAS_UPLOAD_URL;
    const gasUploadSecret = process.env.GAS_UPLOAD_SECRET;
    if (!gasUrl) return NextResponse.json({ ok: false, error: "GAS_UPLOAD_URL belum dikonfigurasi." }, { status: 500 });
    if (!gasUploadSecret) return NextResponse.json({ ok: false, error: "GAS_UPLOAD_SECRET belum dikonfigurasi." }, { status: 500 });

    const idempotencyKey = createHash("sha256")
      .update(`${purpose}:${file.name}:${file.size}:${file.lastModified}:${base64}`)
      .digest("hex");
    const folderName = purpose === "article-media" ? "Artikel Media" : "Dokumen Artikel";

    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData: base64,
        fileName: file.name,
        fileMime: file.type || "application/octet-stream",
        idempotencyKey,
        folderName,
        secret: gasUploadSecret,
      }),
    });
    const responseText = await gasResponse.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      payload = { ok: false, error: `Respons GAS bukan JSON: ${responseText.slice(0, 240)}` };
    }

    if (!gasResponse.ok || (payload.ok !== true && payload.success !== true)) {
      return NextResponse.json(
        { ok: false, error: typeof payload.error === "string" ? payload.error : typeof payload.message === "string" ? payload.message : `Google Apps Script gagal (HTTP ${gasResponse.status}).` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      fileId: payload.fileId,
      fileName: payload.fileName,
      mimeType: file.type || "application/octet-stream",
      url: payload.fileUrl,
      warning: payload.warning || "",
    });
  } catch (error) {
    console.error("Drive upload failed:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Upload dokumen gagal." }, { status: 500 });
  }
}
