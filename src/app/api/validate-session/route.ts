import { NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const SESSION_COOKIE_NAME = "gkjw_session";

function getAdminApp() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Firebase admin credentials are not configured.");
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  }

  return getApps()[0];
}

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const sessionCookie = cookies
      .find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`))
      ?.split("=")
      .slice(1)
      .join("=");

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const decodedClaims = await getAuth(adminApp).verifySessionCookie(sessionCookie, true);

    return NextResponse.json({
      authenticated: true,
      uid: decodedClaims.uid,
      email: decodedClaims.email ?? null,
      role: decodedClaims.role ?? null,
    });
  } catch (error) {
    console.error("Session validation failed:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
