"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type BukuKasJenis = "masuk" | "keluar";

type BukuKasRecord = {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  jenis: BukuKasJenis;
  nominal: number;
};

type BukuKasRow = BukuKasRecord & {
  saldo: number;
  isSaldoAwal?: boolean;
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function parseNominal(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(/[^0-9]/g, ""));
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
}

function getKeteranganPenerimaan(data: any) {
  return (
    data.keterangan ||
    data.nama_jemaat ||
    data.jenis ||
    data.tujuan ||
    data.nama_donatur ||
    "Penerimaan Kas"
  );
}

function getKeteranganPengeluaran(data: any) {
  return data.keterangan || data.nomorNota || "Pengeluaran Kas";
}

export default function BukuKasUmumPage() {
  const now = new Date();
  const [records, setRecords] = useState<BukuKasRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingMonth, setPendingMonth] = useState(now.getMonth() + 1);
  const [pendingYear, setPendingYear] = useState(now.getFullYear());
  const [appliedMonth, setAppliedMonth] = useState(now.getMonth() + 1);
  const [appliedYear, setAppliedYear] = useState(now.getFullYear());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const penerimaanSnapshot = await getDocs(query(collection(db, "penerimaan_kas"), orderBy("createdAt", "asc")));
        const pengeluaranSnapshot = await getDocs(query(collection(db, "pengeluaran_kas"), orderBy("createdAt", "asc")));

        const penerimaanRecords: BukuKasRecord[] = penerimaanSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tanggal: typeof data.tanggal === "string" ? data.tanggal : "",
            keterangan: getKeteranganPenerimaan(data),
            kategori: typeof data.kategori_penerimaan === "string" ? data.kategori_penerimaan : "Pemasukan",
            jenis: "masuk",
            nominal: parseNominal(data.nominal),
          };
        });

        const pengeluaranRecords: BukuKasRecord[] = pengeluaranSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tanggal: typeof data.tanggal === "string" ? data.tanggal : "",
            keterangan: getKeteranganPengeluaran(data),
            kategori: typeof data.kategori === "string" ? data.kategori : "Pengeluaran",
            jenis: "keluar",
            nominal: parseNominal(data.nominal),
          };
        });

        const merged = [...penerimaanRecords, ...pengeluaranRecords].sort((a, b) => {
          const timeA = new Date(a.tanggal).getTime();
          const timeB = new Date(b.tanggal).getTime();
          return timeA - timeB;
        });

        setRecords(merged);
      } catch (fetchError) {
        console.error("Gagal memuat Buku Kas Umum:", fetchError);
        setError("Terjadi kesalahan saat mengambil data. Silakan muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records
      .filter((item) => {
        const itemDate = new Date(item.tanggal);
        if (Number.isNaN(itemDate.getTime())) return false;
        return itemDate.getMonth() === appliedMonth - 1 && itemDate.getFullYear() === appliedYear;
      })
      .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  }, [records, appliedMonth, appliedYear]);

  const saldoAwal = useMemo(() => {
    const boundaryDate = new Date(appliedYear, appliedMonth - 1, 1);
    return records.reduce((sum, item) => {
      const itemDate = new Date(item.tanggal);
      if (Number.isNaN(itemDate.getTime()) || itemDate >= boundaryDate) return sum;
      return sum + (item.jenis === "masuk" ? item.nominal : -item.nominal);
    }, 0);
  }, [records, appliedMonth, appliedYear]);

  const totalPemasukan = useMemo(
    () => filteredRecords.filter((item) => item.jenis === "masuk").reduce((sum, item) => sum + item.nominal, 0),
    [filteredRecords],
  );

  const totalPengeluaran = useMemo(
    () => filteredRecords.filter((item) => item.jenis === "keluar").reduce((sum, item) => sum + item.nominal, 0),
    [filteredRecords],
  );

  const saldoAkhir = useMemo(() => saldoAwal + totalPemasukan - totalPengeluaran, [saldoAwal, totalPemasukan, totalPengeluaran]);

  const rowsWithBalance = useMemo(() => {
    const rows: BukuKasRow[] = [
      {
        id: "saldo-awal",
        tanggal: "",
        keterangan: "Saldo Awal Bulan Ini",
        kategori: "",
        jenis: "masuk",
        nominal: 0,
        saldo: saldoAwal,
        isSaldoAwal: true,
      },
    ];

    let running = saldoAwal;

    filteredRecords.forEach((item) => {
      running += item.jenis === "masuk" ? item.nominal : -item.nominal;
      rows.push({ ...item, saldo: running });
    });

    return rows;
  }, [filteredRecords, saldoAwal]);

  const handleApplyFilter = () => {
    setAppliedMonth(pendingMonth);
    setAppliedYear(pendingYear);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm print:border-black/10 print:bg-white print:shadow-none">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Buku Kas Umum</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Ringkasan keuangan kas gereja</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Lihat pemasukan, pengeluaran, dan saldo berjalan dalam satu tampilan read-only yang rapi.
            </p>
          </div>
          <div className="hidden text-center text-sm font-bold uppercase tracking-[0.24em] print:block">
            Laporan Keuangan GKJW Jemaat Kucur - Bulan {MONTH_NAMES[appliedMonth - 1]} {appliedYear}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 shadow-sm print:border-black/10 print:bg-white print:text-black">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Total Pemasukan</p>
            <p className="mt-4 text-3xl font-semibold text-emerald-950 print:text-black">{formatCurrency(totalPemasukan)}</p>
          </div>
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 shadow-sm print:border-black/10 print:bg-white print:text-black">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-700">Total Pengeluaran</p>
            <p className="mt-4 text-3xl font-semibold text-rose-950 print:text-black">{formatCurrency(totalPengeluaran)}</p>
          </div>
          <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5 shadow-sm print:border-black/10 print:bg-white print:text-black">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Saldo Akhir Saat Ini</p>
            <p className="mt-4 text-3xl font-semibold text-slate-950 print:text-black">{formatCurrency(saldoAkhir)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 print:hidden md:grid-cols-[140px_120px_1fr]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Bulan</label>
            <select
              value={pendingMonth}
              onChange={(event) => setPendingMonth(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Tahun</label>
            <input
              type="number"
              min={2000}
              max={now.getFullYear() + 5}
              value={pendingYear}
              onChange={(event) => setPendingYear(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleApplyFilter}
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Terapkan Filter
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-400"
            >
              Cetak Laporan / Simpan PDF
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm print:border-black/10 print:bg-white print:shadow-none print:p-0">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Tabel Buku Kas</h2>
            <p className="text-sm text-slate-600">Tampilkan pemasukan dan pengeluaran dengan saldo berjalan berdasarkan tanggal.</p>
          </div>
          <p className="text-sm font-medium text-slate-900">Jumlah baris: {filteredRecords.length}</p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Memuat data...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full divide-y divide-slate-200 text-sm print:text-black">
              <thead className="bg-slate-100 text-slate-700 print:bg-slate-200 print:text-black">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan / Uraian</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Pemasukan (Debet)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Pengeluaran (Kredit)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rowsWithBalance.map((row) => (
                  <tr
                    key={row.id}
                    className={row.isSaldoAwal ? "bg-slate-50 font-semibold print:bg-white" : "bg-white"}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.isSaldoAwal ? "-" : formatDate(row.tanggal)}</td>
                    <td className="px-4 py-3 text-slate-700">{row.keterangan}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-700">
                      {row.isSaldoAwal ? "-" : row.jenis === "masuk" ? formatCurrency(row.nominal) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-rose-700">
                      {row.isSaldoAwal ? "-" : row.jenis === "keluar" ? formatCurrency(row.nominal) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-950 print:text-black">{formatCurrency(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
