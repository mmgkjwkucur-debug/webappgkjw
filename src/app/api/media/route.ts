import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isValidFileId(value: string) {
  return /^[a-zA-Z0-9_-]{10,200}$/.test(value);
}

export async function GET(request: Request) {
  const fileId = new URL(request.url).searchParams.get("fileId")?.trim() || "";
  const gasUrl = process.env.GAS_UPLOAD_URL;
  const gasSecret = process.env.GAS_UPLOAD_SECRET;

  if (!isValidFileId(fileId)) return NextResponse.json({ error: "File ID tidak valid." }, { status: 400 });
  if (!gasUrl || !gasSecret) return NextResponse.json({ error: "Konfigurasi media belum tersedia." }, { status: 500 });

  try {
    const response = await fetch(`${gasUrl}?fileId=${encodeURIComponent(fileId)}&secret=${encodeURIComponent(gasSecret)}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success !== true || typeof payload.fileData !== "string") {
      return NextResponse.json({ error: payload.message || "Media tidak dapat dimuat." }, { status: 404 });
    }

    return new Response(Buffer.from(payload.fileData, "base64"), {
      headers: {
        "Content-Type": typeof payload.mimeType === "string" ? payload.mimeType : "application/octet-stream",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Media proxy failed:", error);
    return NextResponse.json({ error: "Media tidak dapat dimuat." }, { status: 502 });
  }
}
