export type PostStatus = "draft" | "published";

export type ChurchPost = {
  id: string;
  judul: string;
  ringkasan: string;
  isi: string;
  fotoUrl?: string;
  videoUrl?: string;
  status: PostStatus;
  tanggal: string;
  authorRole: "admin";
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
