import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase Admin credentials are not configured.");
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  }

  return getApps()[0];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";

    if (!username || !/^[a-z0-9._-]{3,40}$/.test(username)) {
      return NextResponse.json({ error: "Username tidak valid." }, { status: 400 });
    }

    const snapshot = await getFirestore(getAdminApp())
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }

    const email = snapshot.docs[0].data().email;
    if (typeof email !== "string" || !email) {
      return NextResponse.json({ error: "Data akun tidak lengkap." }, { status: 400 });
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error("Username lookup failed:", error);
    return NextResponse.json({ error: "Username tidak dapat diproses." }, { status: 500 });
  }
}
