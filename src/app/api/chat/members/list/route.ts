import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

function getAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey || !databaseURL) throw new Error("Firebase Admin credentials are not configured.");

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL, projectId });
  }

  return getApps()[0];
}

function getSessionCookie(request: Request) {
  return request.headers.get("cookie")?.split("; ").find((cookie) => cookie.startsWith("gkjw_session="))?.slice("gkjw_session=".length) || "";
}

export async function GET(request: Request) {
  try {
    const roomId = new URL(request.url).searchParams.get("roomId") || "";
    const sessionCookie = getSessionCookie(request);
    if (!roomId || !sessionCookie) return NextResponse.json({ error: "Permintaan tidak lengkap." }, { status: 400 });

    const adminApp = getAdminApp();
    const decodedSession = await getAuth(adminApp).verifySessionCookie(sessionCookie, true);
    const room = await getDatabase(adminApp).ref(`chatRooms/${roomId}`).get();
    if (!room.exists() || room.val()?.createdBy !== decodedSession.uid) {
      return NextResponse.json({ error: "Hanya pembuat grup yang dapat melihat daftar jemaat." }, { status: 403 });
    }

    const snapshot = await getFirestore(adminApp).collection("users").get();
    const members = snapshot.docs
      .map((item) => ({ id: item.id, ...(item.data() as { roles?: unknown; nama?: unknown; email?: unknown }) }))
      .filter((item) => Array.isArray(item.roles) && item.roles.includes("jemaat"))
      .map((item) => ({
        uid: item.id,
        nama: typeof item.nama === "string" ? item.nama : "Jemaat",
        email: typeof item.email === "string" ? item.email : "",
      }))
      .filter((item) => item.email)
      .sort((first, second) => first.nama.localeCompare(second.nama, "id"));

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Jemaat member list failed:", error);
    return NextResponse.json({ error: "Daftar jemaat tidak dapat dimuat." }, { status: 500 });
  }
}
