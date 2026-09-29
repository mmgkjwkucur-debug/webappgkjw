"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const JemaatMap = dynamic(() => import("@/components/JemaatMap"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[280px] rounded-3xl border border-slate-200 bg-slate-50/90 p-4 text-slate-600 shadow-sm">
      Memuat peta...
    </div>
  ),
});

type DataIndukRecord = {
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
  status?: string;
};

type TransactionRecord = {
  id: string;
  tanggal: string;
  keterangan: string;
  jenis: "masuk" | "keluar";
  nominal: number;
};

type AnalyticsState = {
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

function parseNominal(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9]/g, ""));
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getTransactionKeterangan(type: "masuk" | "keluar", data: any) {
  if (type === "masuk") {
    return (
      data.keterangan ||
      data.nama_jemaat ||
      data.jenis ||
      data.tujuan ||
      data.nama_donatur ||
      "Penerimaan Kas"
    );
  }

  return data.keterangan || data.nomorNota || "Pengeluaran Kas";
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [dataInduk, setDataInduk] = useState<DataIndukRecord[]>([]);
  const [penerimaanRecords, setPenerimaanRecords] = useState<TransactionRecord[]>([]);
  const [pengeluaranRecords, setPengeluaranRecords] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    const unsubscribeDataInduk = onSnapshot(collection(db, "data_induk"), (snapshot) => {
      if (!isMounted) return;
      setDataInduk(snapshot.docs.map((doc) => ({ ...(doc.data() as DataIndukRecord), id: doc.id })));
      setLoading(false);
    });

    const unsubscribePenerimaan = onSnapshot(collection(db, "penerimaan_kas"), (snapshot) => {
      if (!isMounted) return;
      setPenerimaanRecords(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tanggal: typeof data.tanggal === "string" ? data.tanggal : "",
            keterangan: getTransactionKeterangan("masuk", data),
            jenis: "masuk",
            nominal: parseNominal(data.nominal),
          };
        }),
      );
      setLoading(false);
    });

    const unsubscribePengeluaran = onSnapshot(collection(db, "pengeluaran_kas"), (snapshot) => {
      if (!isMounted) return;
      setPengeluaranRecords(
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tanggal: typeof data.tanggal === "string" ? data.tanggal : "",
            keterangan: getTransactionKeterangan("keluar", data),
            jenis: "keluar",
            nominal: parseNominal(data.nominal),
          };
        }),
      );
      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribeDataInduk();
      unsubscribePenerimaan();
      unsubscribePengeluaran();
    };
  }, []);

  const activeCount = useMemo(
    () => dataInduk.filter((item) => normalize(item.status) === "aktif").length,
    [dataInduk],
  );

  const nonActiveCount = useMemo(
    () => dataInduk.filter((item) => normalize(item.status) !== "aktif").length,
    [dataInduk],
  );

  const analytics = useMemo(() => {
    const genderCounts = dataInduk.reduce(
      (acc, item) => {
        const gender = classifyGender(item.jenisKelamin);
        if (gender === "Laki-laki") acc.lakiLaki += 1;
        if (gender === "Perempuan") acc.perempuan += 1;
        return acc;
      },
      { lakiLaki: 0, perempuan: 0 },
    );

    const ageBuckets = new Map<string, number>();
    dataInduk.forEach((item) => {
      const label = classifyAgeGroup(item.kategoriUsia);
      ageBuckets.set(label, (ageBuckets.get(label) ?? 0) + 1);
    });

    const ageGroups = ageOrder
      .filter((label) => ageBuckets.has(label))
      .map((label) => ({ label, count: ageBuckets.get(label) ?? 0 }));

    const pins = dataInduk
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
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return {
      lakiLaki: genderCounts.lakiLaki,
      perempuan: genderCounts.perempuan,
      ageGroups,
      pins,
    };
  }, [dataInduk]);

  const now = new Date();
  const todayLabel = formatFullDate(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  const monthlyPenerimaanTotal = useMemo(
    () =>
      penerimaanRecords
        .filter((item) => {
          const date = new Date(item.tanggal);
          return !Number.isNaN(date.getTime()) && date >= monthStart && date < nextMonthStart;
        })
        .reduce((sum, item) => sum + item.nominal, 0),
    [penerimaanRecords, monthStart, nextMonthStart],
  );

  const monthlyPengeluaranTotal = useMemo(
    () =>
      pengeluaranRecords
        .filter((item) => {
          const date = new Date(item.tanggal);
          return !Number.isNaN(date.getTime()) && date >= monthStart && date < nextMonthStart;
        })
        .reduce((sum, item) => sum + item.nominal, 0),
    [pengeluaranRecords, monthStart, nextMonthStart],
  );

  const saldoBulan = useMemo(() => monthlyPenerimaanTotal - monthlyPengeluaranTotal, [monthlyPenerimaanTotal, monthlyPengeluaranTotal]);

  const recentTransactions = useMemo(
    () =>
      [...penerimaanRecords, ...pengeluaranRecords]
        .filter((item) => item.tanggal)
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
        .slice(0, 5),
    [penerimaanRecords, pengeluaranRecords],
  );

  const genderMax = Math.max(1, analytics.lakiLaki, analytics.perempuan);
  const ageMax = Math.max(1, ...analytics.ageGroups.map((item) => item.count));

  return (
    <div className="min-w-0">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-10 text-white shadow-xl shadow-emerald-950/20 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">GKJW Jemaat Kucur · Sistem Administrasi</p>
          <h1 className="mt-4 text-2xl md:text-3xl leading-snug font-semibold tracking-tight text-white">Selamat Datang di Sistem Administrasi GKJW Jemaat Kucur</h1>
          <p className="mt-3 text-base leading-7 text-emerald-100/85">{todayLabel}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Total Jemaat Aktif</p>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{loading ? "..." : activeCount.toLocaleString("id-ID")}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3L19 5c0-1.66-1.34-3-3-3H8C6.34 2 5 3.34 5 5v3c0 1.66 1.34 3 3 3h8Zm1.5 2H6.5C4.57 13 3 14.57 3 16.5V19h18v-2.5c0-1.93-1.57-3.5-3.5-3.5Zm-5 5c-1.93 0-3.5-1.57-3.5-3.5S9.57 11 11.5 11 15 12.57 15 14.5 13.43 18 11.5 18Z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Jemaat Pindah/Meninggal</p>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{loading ? "..." : nonActiveCount.toLocaleString("id-ID")}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Zm-2 11H7v-2h10v2Zm0-4H7V8h10v2Z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Saldo Kas Bulan Ini</p>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{loading ? "..." : formatCurrency(saldoBulan)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 14.5V18h-2v-1.5c-1.45-.5-2.5-1.95-2.5-3.5 0-2.21 1.79-4 4-4h1V7h2v2h1.5c1.1 0 2 .9 2 2 0 1.49-1.05 2.74-2.5 3.24V18h-2v-1.5h-2Z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Total Kas Keluar Bulan Ini</p>
                <p className="mt-4 text-2xl font-bold tracking-tight text-slate-950">{loading ? "..." : formatCurrency(monthlyPengeluaranTotal)}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                  <path d="M21 11.5a1 1 0 0 0-1-1h-6.5v-6a1 1 0 0 0-2 0v6H4a1 1 0 0 0 0 2h7.5v6a1 1 0 0 0 2 0v-6H20a1 1 0 0 0 1-1Z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Aktivitas Keuangan Terakhir</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">5 Transaksi Terbaru</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">{loading ? "..." : recentTransactions.length} transaksi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Jenis</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading
                  ? [...Array(5)].map((_, idx) => (
                      <tr key={idx} className="bg-white">
                        <td className="whitespace-nowrap px-4 py-4 text-slate-400">Memuat...</td>
                        <td className="px-4 py-4 text-slate-400">Memuat...</td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-400">Memuat...</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-slate-400">Memuat...</td>
                      </tr>
                    ))
                  : recentTransactions.length > 0
                  ? recentTransactions.map((transaction) => (
                      <tr key={transaction.id} className="bg-white hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatFullDate(new Date(transaction.tanggal))}</td>
                        <td className="px-4 py-4 text-slate-700">{transaction.keterangan}</td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              transaction.jenis === "masuk" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {transaction.jenis === "masuk" ? "Masuk" : "Keluar"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-950">{formatCurrency(transaction.nominal)}</td>
                      </tr>
                    ))
                  : (
                    <tr className="bg-white">
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                        Belum ada transaksi kas untuk ditampilkan.
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Peta Sebaran Warga Jemaat</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Visualisasi jemaat</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{analytics.pins.length} titik</span>
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
      </div>
    </div>
  );
}
