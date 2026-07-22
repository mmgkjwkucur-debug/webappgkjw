"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

const JemaatMap = dynamic(() => import("@/components/JemaatMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[280px] rounded-3xl border border-slate-200 bg-slate-50/90 p-4 text-slate-600 shadow-sm">
      Memuat peta...
    </div>
  ),
});

type JemaatRecord = {
  id: string;
  nama?: string;
  jenisKelamin?: string;
  kategoriUsia?: string;
  pinPoint?: string;
  nik?: string;
  alamat?: string;
  nomorHp?: string;
  email?: string;
  statusPerkawinan?: string;
};

type AnalyticsState = {
  totalJemaat: number;
  lakiLaki: number;
  perempuan: number;
  ageGroups: Array<{ label: string; count: number }>;
  pins: Array<{
    id: string;
    nama: string;
    lat: number;
    lng: number;
    nik?: string;
    alamat?: string;
    nomorHp?: string;
    email?: string;
    jenisKelamin?: string;
    kategoriUsia?: string;
    statusPerkawinan?: string;
  }>;
};

const ageOrder = ["Dewasa", "Pemuda", "Remaja", "Balita", "Anak", "Lainnya"];

function normalize(value?: string) {
  return (value ?? "").toString().trim().toLowerCase();
}

function classifyGender(value?: string) {
  const normalized = normalize(value);
  if (normalized.includes("perempuan") || normalized.includes("wanita") || normalized.includes("female")) {
    return "Perempuan";
  }
  if (normalized.includes("laki") || normalized.includes("pria") || normalized.includes("male")) {
    return "Laki-laki";
  }
  return "Lainnya";
}

function classifyAgeGroup(value?: string) {
  const normalized = normalize(value);
  if (normalized.includes("balita")) return "Balita";
  if (normalized.includes("remaja")) return "Remaja";
  if (normalized.includes("pemuda")) return "Pemuda";
  if (normalized.includes("dewasa")) return "Dewasa";
  if (normalized.includes("anak")) return "Anak";
  return "Lainnya";
}

function parsePoint(pinPoint?: string) {
  if (!pinPoint) return null;
  const numbers = pinPoint.match(/-?\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length < 2) return null;
  const lat = Number(numbers[0]);
  const lng = Number(numbers[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

export default function AdminPage() {
  const [counts, setCounts] = useState({ jemaat: 0, publishedPosts: 0, thisWeekSchedules: 0 });
  const [analytics, setAnalytics] = useState<AnalyticsState>({
    totalJemaat: 0,
    lakiLaki: 0,
    perempuan: 0,
    ageGroups: [],
    pins: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCounts() {
      try {
        const [jemaatSnapshot, postsSnapshot, schedulesSnapshot] = await Promise.all([
          getDocs(collection(db, "jemaat")),
          getDocs(query(collection(db, "posts"), where("status", "==", "published"))),
          getDocs(query(collection(db, "jadwal"), where("isPublic", "==", true))),
        ]);

        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setHours(0, 0, 0, 0);
        const day = startOfWeek.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        startOfWeek.setDate(startOfWeek.getDate() + diff);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const thisWeekSchedules = schedulesSnapshot.docs.filter((document) => {
          const value = document.data().tanggal;
          if (!value) return false;
          const scheduleDate = new Date(value);
          return !Number.isNaN(scheduleDate.getTime()) && scheduleDate >= startOfWeek && scheduleDate <= endOfWeek;
        }).length;

        const records = jemaatSnapshot.docs.map((document) => ({
          ...(document.data() as JemaatRecord),
          id: document.id,
        }));

        const genderCounts = records.reduce(
          (accumulator, item) => {
            const gender = classifyGender(item.jenisKelamin);
            if (gender === "Laki-laki") accumulator.lakiLaki += 1;
            if (gender === "Perempuan") accumulator.perempuan += 1;
            return accumulator;
          },
          { lakiLaki: 0, perempuan: 0 },
        );

        const ageBuckets = new Map<string, number>();
        records.forEach((item) => {
          const label = classifyAgeGroup(item.kategoriUsia);
          ageBuckets.set(label, (ageBuckets.get(label) ?? 0) + 1);
        });

        const ageGroups = ageOrder
          .filter((label) => ageBuckets.has(label))
          .map((label) => ({ label, count: ageBuckets.get(label) ?? 0 }));

        const pins = records
          .map((item) => {
            const point = parsePoint(item.pinPoint);
            if (!point) return null;
            return {
              id: item.id,
              nama: item.nama ?? "Tanpa nama",
              lat: point.lat,
              lng: point.lng,
              nik: item.nik,
              alamat: item.alamat,
              nomorHp: item.nomorHp,
              email: item.email,
              jenisKelamin: item.jenisKelamin,
              kategoriUsia: item.kategoriUsia,
              statusPerkawinan: item.statusPerkawinan,
            } satisfies AnalyticsState["pins"][number];
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        if (!isMounted) return;
        setCounts({
          jemaat: jemaatSnapshot.size,
          publishedPosts: postsSnapshot.size,
          thisWeekSchedules,
        });
        setAnalytics({
          totalJemaat: jemaatSnapshot.size,
          lakiLaki: genderCounts.lakiLaki,
          perempuan: genderCounts.perempuan,
          ageGroups,
          pins,
        });
      } catch (error) {
        console.error("Gagal memuat statistik dashboard:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const genderMax = Math.max(1, analytics.lakiLaki, analytics.perempuan);
  const ageMax = Math.max(1, ...analytics.ageGroups.map((item) => item.count));

  return (
    <div className="min-w-0">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-9 text-white shadow-xl shadow-emerald-950/15 sm:px-8">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />
          <p className="relative text-xs font-bold uppercase tracking-[0.28em] text-amber-300">GKJW Jemaat Kucur · CMS</p>
          <h1 className="relative mt-4 font-serif text-4xl leading-tight text-emerald-50">Selamat datang kembali.</h1>
          <p className="relative mt-3 max-w-xl text-base leading-7 text-emerald-50/70">Ringkasan aktivitas pelayanan dan administrasi jemaat dalam satu ruang kerja.</p>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Total Jemaat</p>
            <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{loading ? "..." : counts.jemaat.toLocaleString("id-ID")}</p>
          </div>

          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Artikel Terpublikasi</p>
            <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{loading ? "..." : counts.publishedPosts.toLocaleString("id-ID")}</p>
          </div>

          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">Jadwal Minggu Ini</p>
            <p className="mt-5 text-4xl font-bold tracking-tight text-slate-950">{loading ? "..." : counts.thisWeekSchedules.toLocaleString("id-ID")}</p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">Komposisi Jemaat</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Gender</span>
            </div>
            <div className="space-y-5">
              {[{ label: "Laki-laki", value: analytics.lakiLaki }, { label: "Perempuan", value: analytics.perempuan }].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.value.toLocaleString("id-ID")}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{Math.round((item.value / genderMax) * 100)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.label === "Laki-laki" ? "bg-emerald-700" : "bg-amber-500"}`} style={{ width: `${(item.value / genderMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-slate-950">Kategori Usia</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800">Live data</span>
            </div>
            <div className="space-y-5">
              {analytics.ageGroups.length > 0 ? (
                analytics.ageGroups.map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.count.toLocaleString("id-ID")}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{Math.round((item.count / ageMax) * 100)}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(item.count / ageMax) * 100}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Belum ada kategori usia pada data jemaat.</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Peta Sebaran Warga Jemaat</h2>
              <p className="mt-2 text-sm text-slate-500">Visualisasi tempat tinggal warga jemaat di peta.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{analytics.pins.length} titik</span>
          </div>
          <div className="min-h-[360px] overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 p-2">
            {analytics.pins.length > 0 ? (
              <JemaatMap points={analytics.pins} />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-slate-500">
                Belum ada pin point pada data jemaat. Tambahkan pin point di form input untuk melihat marker di peta.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Papan Informasi Internal</h2>
          <p className="mt-3 text-slate-600">Gunakan menu di sebelah kiri untuk mengelola konten website publik atau data administrasi gereja.</p>
        </section>
      </div>
    </div>
  );
}
