import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminCredential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
    } catch (error) {
      console.error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON:", error);
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON.");
    }
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }

  return null;
}

function getAdminAuth() {
  const credential = getAdminCredential();

  if (!credential) {
    return null;
  }

  const app = getApps().length ? getApps()[0] : initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return getAuth(app);
}

export async function POST(request: Request) {
  try {
    const { uid, email } = await request.json();
    const auth = getAdminAuth();

    if (!uid && !email) {
      return NextResponse.json({ success: false, message: "UID atau email harus disediakan." }, { status: 400 });
    }

    if (!auth) {
      return NextResponse.json({
        success: false,
        message: "Firebase Admin credential belum tersedia. Set FIREBASE_SERVICE_ACCOUNT_KEY atau FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY agar delete akun Auth bisa berjalan.",
      }, { status: 500 });
    }

    if (uid) {
      try {
        await auth.deleteUser(uid);
        return NextResponse.json({ success: true, message: "Akun Firebase Auth berhasil dihapus." }, { status: 200 });
      } catch (error) {
        const description = error instanceof Error ? error.message : "Unknown error";

        if (email) {
          console.warn("Tidak dapat menghapus UID Auth, mencoba hapus berdasarkan email:", description);
        } else {
          console.error("Delete user route error, invalid UID and no email fallback:", error);
          return NextResponse.json({ success: false, message: `UID Auth tidak ditemukan atau tidak valid. ${description}` }, { status: 404 });
        }
      }
    }

    if (!email) {
      return NextResponse.json({ success: false, message: "UID atau email harus disediakan." }, { status: 400 });
    }

    const users = await auth.listUsers(1000);
    const userRecord = users.users.find((user) => user.email === email);

    if (!userRecord) {
      return NextResponse.json({ success: false, message: "Akun Auth tidak ditemukan berdasarkan email." }, { status: 404 });
    }

    await auth.deleteUser(userRecord.uid);
    return NextResponse.json({ success: true, message: "Akun Firebase Auth berhasil dihapus berdasarkan email." }, { status: 200 });
  } catch (error) {
    console.error("Delete user route error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message: `Gagal menghapus akun Auth. ${message}` }, { status: 500 });
  }
}
