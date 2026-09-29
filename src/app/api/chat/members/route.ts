import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function getAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey || !databaseURL) {
      throw new Error("Firebase Admin credentials are not configured.");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      databaseURL,
      projectId,
    });
  }

  return getApps()[0];
}

function getSessionCookie(request: Request) {
  return request.headers.get("cookie")?.split("; ").find((cookie) => cookie.startsWith("gkjw_session="))?.slice("gkjw_session=".length) || "";
}

export async function POST(request: Request) {
  try {
    const sessionCookie = getSessionCookie(request);
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const roomId = typeof body.roomId === "string" ? body.roomId : "";

    if (!sessionCookie || !email || !roomId) {
      return NextResponse.json({ error: "Data anggota tidak lengkap." }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const adminAuth = getAuth(adminApp);
    const decodedSession = await adminAuth.verifySessionCookie(sessionCookie, true);
    const roomSnapshot = await getDatabase(adminApp).ref(`chatRooms/${roomId}`).get();

    if (!roomSnapshot.exists() || roomSnapshot.val()?.createdBy !== decodedSession.uid) {
      return NextResponse.json({ error: "Hanya pembuat grup yang dapat menambahkan anggota." }, { status: 403 });
    }

    const member = await adminAuth.getUserByEmail(email);
    return NextResponse.json({ uid: member.uid });
  } catch (error) {
    console.error("Chat member lookup failed:", error);
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    return NextResponse.json({ error: code === "auth/user-not-found" ? "Akun dengan email tersebut tidak ditemukan." : "Anggota tidak dapat ditambahkan." }, { status: 400 });
  }
}
