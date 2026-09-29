export type DriveUploadPurpose = "article-media" | "article-document";

export type DriveUploadResult = {
  ok: true;
  fileId: string;
  fileName: string;
  url: string;
  mimeType: string;
};

export async function uploadToDrive(file: File, purpose: DriveUploadPurpose) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const responseText = await response.text();
  let payload: Partial<DriveUploadResult> & { error?: string } = {};
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = { error: responseText.slice(0, 240) };
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || `Upload dokumen gagal (HTTP ${response.status}).`);
  }

  return payload as DriveUploadResult;
}
