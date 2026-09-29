export type PostStatus = "draft" | "published";
export type PostCategory = "Warta Jemaat" | "Pelayanan" | "Kegiatan" | "Pengumuman" | "Umum";

export type ChurchPost = {
  id: string;
  judul: string;
  slug?: string;
  kategori?: PostCategory;
  tags?: string[];
  ringkasan: string;
  isi: string;
  fotoUrl?: string;
  fotoDriveId?: string;
  videoUrl?: string;
  dokumenUrl?: string;
  dokumenDriveId?: string;
  status: PostStatus;
  isFeatured?: boolean;
  tanggal: string;
  updatedAt?: string;
  authorRole: string;
};

export type WorshipSchedule = {
  id: string;
  judul: string;
  tanggal: string;
  waktu: string;
  lokasi: string;
  pelayan: string;
  catatan: string;
  isPublic: boolean;
  authorRole: "admin";
};

export type PublicMenuStatus = "draft" | "published";

export type PublicMenu = {
  id: string;
  label: string;
  slug: string;
  parentId: string;
  order: number;
  status: PublicMenuStatus;
  pageTitle: string;
  pageSummary: string;
  pageContent: string;
  ctaLabel: string;
  ctaUrl: string;
  createdAt: string;
  updatedAt: string;
  authorRole: "admin";
};

export function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "full",
  }).format(new Date(value));
}

export function getPostImageSrc(post: Pick<ChurchPost, "fotoDriveId" | "fotoUrl">) {
  if (post.fotoDriveId) return `/api/media?fileId=${encodeURIComponent(post.fotoDriveId)}`;
  const legacyFileId = post.fotoUrl?.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1] ?? post.fotoUrl?.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (legacyFileId) return `/api/media?fileId=${encodeURIComponent(legacyFileId)}`;
  return post.fotoUrl ?? "";
}
