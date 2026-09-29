"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CATEGORICAL_OPTIONS = ["Anak", "Remaja", "Pemuda", "Dewasa", "Lansia"] as const;
const IBADAH_OPTIONS = [
  "Ibadah Minggu Pagi",
  "Ibadah Minggu Sore",
  "Persekutuan Pemuda",
  "Ibadah Remaja",
  "Ibadah Wilayah/Blok",
] as const;

const SAFE_DAYS = 14;
const WARNING_DAYS = 30;

type CategoricalOption = (typeof CATEGORICAL_OPTIONS)[number];
type IbadahOption = (typeof IBADAH_OPTIONS)[number];

type JemaatRecord = {
  id: string;
  nama?: string;
  kategoriUsia?: string;
  alamat?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  pinPoint?: string;
  wilayah?: string;
  blok?: string;
  nomorHp?: string;
};

type JadwalRecord = {
  id: string;
  jenis: string;
};

type AbsensiRecord = {
  id: string;
  id_jadwal: string;
  id_jemaat: string;
  waktu_hadir?: unknown;
};

type EwsStatus = "Kritis" | "Perhatian";

type EwsItem = {
  jemaat: JemaatRecord;
  status: EwsStatus;
  daysAway: number | null;
  badgeText: string;
  region: string;
};

const parseFirestoreDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDaysSince = (date: Date) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const then = new Date(date);
  then.setHours(0, 0, 0, 0);
  const diff = now.getTime() - then.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const normalizePhoneNumber = (raw?: string) => {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

const getRegionLabel = (jemaat: JemaatRecord) => {
  return jemaat.wilayah || jemaat.blok || jemaat.alamat || jemaat.desaKelurahan || jemaat.kecamatan || "-";
};

export default function EwsPage() {
  const [jemaatList, setJemaatList] = useState<JemaatRecord[]>([]);
  const [jadwalMap, setJadwalMap] = useState<Record<string, JadwalRecord>>({});
  const [attendanceList, setAttendanceList] = useState<AbsensiRecord[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoricalOption[]>([...CATEGORICAL_OPTIONS]);
  const [selectedIbadah, setSelectedIbadah] = useState<IbadahOption[]>([
    "Ibadah Minggu Pagi",
    "Ibadah Minggu Sore",
  ]);
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    const jemaatQuery = query(collection(db, "data_induk"), orderBy("nama", "asc"));
    const unsubscribe = onSnapshot(jemaatQuery, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return {
            id: doc.id,
            nama: typeof data.nama === "string" ? data.nama : "-",
            kategoriUsia: typeof data.kategoriUsia === "string" ? data.kategoriUsia : undefined,
            alamat: typeof data.alamat === "string" ? data.alamat : undefined,
            desaKelurahan: typeof data.desaKelurahan === "string" ? data.desaKelurahan : undefined,
            kecamatan: typeof data.kecamatan === "string" ? data.kecamatan : undefined,
            pinPoint: typeof data.pinPoint === "string" ? data.pinPoint : undefined,
            wilayah: typeof data.wilayah === "string" ? data.wilayah : undefined,
            blok: typeof data.blok === "string" ? data.blok : undefined,
            nomorHp: typeof data.nomorHp === "string" ? data.nomorHp : undefined,
          } as JemaatRecord;
        })
        .filter((item): item is JemaatRecord => Boolean(item));
      setJemaatList(items);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const jadwalQuery = query(collection(db, "jadwal_ibadah"), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(jadwalQuery, (snapshot) => {
      const nextMap = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data() as DocumentData;
        if (!doc.id || typeof data.jenis !== "string") return acc;
        acc[doc.id] = { id: doc.id, jenis: data.jenis };
        return acc;
      }, {} as Record<string, JadwalRecord>);
      setJadwalMap(nextMap);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const attendanceQuery = query(collection(db, "absensi_ibadah"), orderBy("waktu_hadir", "desc"));
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          if (typeof data.id_jadwal !== "string" || typeof data.id_jemaat !== "string") return null;
          return {
            id: doc.id,
            id_jadwal: data.id_jadwal,
            id_jemaat: data.id_jemaat,
            waktu_hadir: data.waktu_hadir,
          } as AbsensiRecord;
        })
        .filter((item): item is AbsensiRecord => Boolean(item));
      setAttendanceList(items);
    });

    return unsubscribe;
  }, []);

  const toggleCategory = (category: CategoricalOption) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category],
    );
  };

  const toggleIbadah = (ibadah: IbadahOption) => {
    setSelectedIbadah((current) =>
      current.includes(ibadah) ? current.filter((value) => value !== ibadah) : [...current, ibadah],
    );
  };

  const visibleJemaat = useMemo(
    () => jemaatList.filter((item) => selectedCategories.includes(item.kategoriUsia as CategoricalOption)),
    [jemaatList, selectedCategories],
  );

  const latestAttendanceByJemaat = useMemo(() => {
    const latest: Record<string, Date> = {};
    attendanceList.forEach((record) => {
      const jadwal = jadwalMap[record.id_jadwal];
      if (!jadwal || !selectedIbadah.includes(jadwal.jenis as IbadahOption)) return;
      const occurred = parseFirestoreDate(record.waktu_hadir);
      if (!occurred) return;
      const current = latest[record.id_jemaat];
      if (!current || occurred > current) {
        latest[record.id_jemaat] = occurred;
      }
    });
    return latest;
  }, [attendanceList, jadwalMap, selectedIbadah]);

  const ewsResults = useMemo(() => {
    return visibleJemaat
      .map((item) => {
        const lastDate = latestAttendanceByJemaat[item.id] ?? null;
        const daysAway = lastDate ? getDaysSince(lastDate) : null;
        const status: EwsStatus = daysAway === null || daysAway > WARNING_DAYS ? "Kritis" : "Perhatian";
        if (daysAway !== null && daysAway <= SAFE_DAYS) return null;

        const badgeText = lastDate
          ? `Tidak hadir ${daysAway} hari`
          : "Belum pernah hadir";

        return {
          jemaat: item,
          status,
          daysAway,
          badgeText,
          region: getRegionLabel(item),
        } as EwsItem;
      })
      .filter((item): item is EwsItem => Boolean(item))
      .sort((a, b) => {
        const rank = (status: EwsStatus) => (status === "Kritis" ? 0 : 1);
        const rankDiff = rank(a.status) - rank(b.status);
        if (rankDiff !== 0) return rankDiff;
        if (a.daysAway === null) return -1;
        if (b.daysAway === null) return 1;
        return b.daysAway - a.daysAway;
      });
  }, [visibleJemaat, latestAttendanceByJemaat]);

  const selectedTag = selectedIbadah.length ? selectedIbadah.join(", ") : "Tidak ada jenis ibadah terpilih";

  return (
    <div className="space-y-6 px-4 pb-8 sm:px-6 lg:px-0">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 text-left"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">⚙️ Filter Evaluasi EWS</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Pantau Keaktifan Jemaat</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Filter jemaat berdasarkan kategorial dan jenis ibadah. Hasil update otomatis setiap perubahan.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {filtersOpen ? "Sembunyikan" : "Tampilkan"}
          </span>
        </button>

        {filtersOpen ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Target Kategorial</p>
              <div className="mt-4 space-y-3">
                {CATEGORICAL_OPTIONS.map((category) => (
                  <label key={category} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Filter Jenis Ibadah</p>
              <div className="mt-4 space-y-3">
                {IBADAH_OPTIONS.map((type) => (
                  <label key={type} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:border-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedIbadah.includes(type)}
                      onChange={() => toggleIbadah(type)}
                      className="h-4 w-4 accent-emerald-700"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <div>
            <p className="font-semibold text-slate-900">Threshold permanen</p>
            <p>AMAN: hadir dalam ≤ {SAFE_DAYS} hari. PERHATIAN: 15–{WARNING_DAYS} hari. KRITIS: {`>${WARNING_DAYS}`} hari atau belum pernah hadir.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Kategori: {selectedCategories.join(", ") || "–"}</span>
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">Jenis Ibadah: {selectedTag}</span>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">EWS Keaktifan</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Daftar Jemaat Perhatian & Kritis</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">Perhatian: {ewsResults.filter((item) => item.status === "Perhatian").length}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-800">Kritis: {ewsResults.filter((item) => item.status === "Kritis").length}</span>
            </div>
          </div>

          <div className="mt-4 text-sm text-slate-500">
            Hanya menampilkan jemaat yang sedang dalam status PERHATIAN dan KRITIS. Status AMAN disembunyikan agar fokus ke respons cepat.
          </div>
        </div>

        {ewsResults.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-8 text-center text-slate-600 shadow-sm">
            Semua jemaat yang terpilih berada dalam rentang AMAN atau tidak ada data yang cocok saat ini.
          </div>
        ) : (
          <div className="grid gap-4">
            {ewsResults.map((item) => (
              <article
                key={item.jemaat.id}
                className={`overflow-hidden rounded-[1.75rem] border-l-4 p-6 shadow-sm ${
                  item.status === "Kritis" ? "border-rose-500 bg-rose-50" : "border-amber-400 bg-amber-50"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      <span>{item.jemaat.kategoriUsia ?? "-"}</span>
                      <span className="text-slate-400">·</span>
                      <span>{item.region}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-slate-950">{item.jemaat.nama ?? "Nama tidak tersedia"}</h3>
                    <p className="max-w-2xl text-sm leading-6 text-slate-700">Jemaat ini masuk pada filter kategorial yang dipilih dan belum hadir pada jenis ibadah yang dipantau.</p>
                  </div>

                  <div className="flex flex-col items-start gap-3 sm:items-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "Kritis" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.badgeText}
                    </span>
                    {normalizePhoneNumber(item.jemaat.nomorHp) ? (
                      <a
                        href={`https://wa.me/${normalizePhoneNumber(item.jemaat.nomorHp)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Hubungi via WA
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
                      >
                        Nomor WA tidak tersedia
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
