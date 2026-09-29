import { collection, doc, getDoc, getDocs, limit, query, where, type Firestore } from "firebase/firestore";

export const ROLE_OPTIONS = [
  {
    id: "admin",
    label: "Admin",
    description: "Akses penuh ke seluruh CMS, termasuk pengaturan akses menu per role.",
  },
  {
    id: "sekretariat",
    label: "Sekretariat",
    description: "Mengelola surat, notulensi rapat, dan administrasi sekretariat.",
  },
  {
    id: "bendahara",
    label: "Bendahara",
    description: "Mengelola penerimaan dan pengeluaran kas gereja.",
  },
  {
    id: "phmj",
    label: "PHMJ",
    description: "Mengelola kegiatan dan data keanggotaan PHMJ.",
  },
  {
    id: "majelis",
    label: "Majelis",
    description: "Mengakses data kepengurusan dan kegiatan majelis.",
  },
  {
    id: "multi_media",
    label: "Multi Media",
    description: "Mengelola artikel, konten publik, jadwal, dan media digital.",
  },
] as const;

export type UserRole = (typeof ROLE_OPTIONS)[number]["id"];

export const MENU_OPTIONS = [
  { id: "/admin", label: "Dashboard" },
  { id: "/admin/posts", label: "Kelola Artikel & Web" },
  { id: "/admin/jadwal", label: "Jadwal Ibadah" },
  { id: "/jadwal/scanner", label: "Scanner Presensi" },
  { id: "/admin/buku-induk-jemaat", label: "Buku Induk Jemaat" },
  { id: "/admin/buku-induk-jemaat/daftar-kartu-keluarga", label: "Daftar Kartu Keluarga (KK)" },
  { id: "/admin/jemaat", label: "Daftar Anggota Jemaat" },
  { id: "/admin/ews", label: "EWS Keaktifan Jemaat" },
  { id: "/admin/buku-induk-jemaat/mutasi-jemaat", label: "Mutasi Jemaat" },
  { id: "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-masuk", label: "Atestasi Masuk" },
  { id: "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-keluar", label: "Atestasi Keluar" },
  { id: "/admin/buku-induk-jemaat/mutasi-jemaat/meninggal", label: "Meninggal" },
  { id: "/admin/penerimaan-kas", label: "Penerimaan Kas" },
  // Subpages have been consolidated into the single Penerimaan Kas page
  { id: "/admin/pengeluaran-kas", label: "Pengeluaran Kas" },
  { id: "/admin/buku-kas-umum", label: "Buku Kas Umum" },
  { id: "/admin/sekretariat", label: "Sekretariat & Surat" },
  { id: "/admin/sekretariat/permohonan-surat", label: "Permohonan Surat" },
  { id: "/admin/sekretariat/notulensi-rapat", label: "Notulensi Rapat" },
  { id: "/admin/sekretariat/asisten-ai", label: "Asisten AI Admin" },
  { id: "/admin/users", label: "Manajemen User" },
] as const;

export type RoleMenuAccessMap = Record<UserRole, string[]>;

export const DEFAULT_ROLE_MENU_ACCESS: RoleMenuAccessMap = {
  admin: MENU_OPTIONS.map((item) => item.id),
  sekretariat: [
    "/admin",
    "/admin/buku-induk-jemaat",
    "/admin/buku-induk-jemaat/daftar-kartu-keluarga",
    "/admin/jemaat",
    "/admin/ews",
    "/admin/buku-induk-jemaat/mutasi-jemaat",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-masuk",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-keluar",
    "/admin/buku-induk-jemaat/mutasi-jemaat/meninggal",
    "/admin/sekretariat",
    "/admin/sekretariat/permohonan-surat",
    "/admin/sekretariat/notulensi-rapat",
    "/admin/sekretariat/asisten-ai",
  ],
  bendahara: [
    "/admin",
    "/admin/penerimaan-kas",
    "/admin/pengeluaran-kas",
    "/admin/buku-kas-umum",
  ],
  phmj: [
    "/admin",
    "/admin/buku-induk-jemaat",
    "/admin/buku-induk-jemaat/daftar-kartu-keluarga",
    "/admin/jemaat",
    "/admin/ews",
    "/admin/buku-induk-jemaat/mutasi-jemaat",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-masuk",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-keluar",
    "/admin/buku-induk-jemaat/mutasi-jemaat/meninggal",
  ],
  majelis: [
    "/admin",
    "/admin/buku-induk-jemaat",
    "/admin/buku-induk-jemaat/daftar-kartu-keluarga",
    "/admin/jemaat",
    "/admin/ews",
    "/admin/buku-induk-jemaat/mutasi-jemaat",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-masuk",
    "/admin/buku-induk-jemaat/mutasi-jemaat/atestasi-keluar",
    "/admin/buku-induk-jemaat/mutasi-jemaat/meninggal",
  ],
  multi_media: [
    "/admin",
    "/admin/posts",
    "/admin/jadwal",
    "/jadwal/scanner",
    "/admin/penerimaan-kas",
    "/admin/pengeluaran-kas",
    "/admin/buku-kas-umum",
  ],
};

export function getRoleLabel(role: string) {
  return ROLE_OPTIONS.find((item) => item.id === role)?.label ?? role;
}

export function normalizeRoles(data: { role?: unknown; roles?: unknown }) {
  if (Array.isArray(data.roles)) {
    return data.roles.filter((role): role is UserRole =>
      ROLE_OPTIONS.some((option) => option.id === role),
    );
  }

  if (typeof data.role === "string" && ROLE_OPTIONS.some((option) => option.id === data.role)) {
    return [data.role as UserRole];
  }

  return [];
}

export function normalizeMenuPaths(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return Array.from(
    new Set(
      value.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  );
}

export async function resolveUserRoles(db: Firestore, user: { uid: string; email?: string | null }) {
  const uidDoc = await getDoc(doc(db, "users", user.uid));

  if (uidDoc.exists()) {
    const roles = normalizeRoles(uidDoc.data());
    if (roles.length > 0) {
      return roles;
    }
  }

  if (user.email) {
    const snapshot = await getDocs(query(collection(db, "users"), where("email", "==", user.email), limit(1)));

    if (!snapshot.empty) {
      const roles = normalizeRoles(snapshot.docs[0].data());
      if (roles.length > 0) {
        return roles;
      }
    }
  }

  return [];
}
