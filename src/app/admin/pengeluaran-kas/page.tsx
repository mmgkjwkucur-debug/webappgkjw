"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

const kategoriOptions = [
  "Operasional",
  "Honorarium/Gaji",
  "Kegiatan & Pelayanan",
  "Diakonia & Sosial",
  "Pembangunan & Pemeliharaan",
  "Lain-lain",
] as const;

type KategoriPengeluaran = (typeof kategoriOptions)[number];

type PengeluaranKasRecord = {
  id: string;
  tanggal: string;
  kategori: KategoriPengeluaran;
  nomorNota?: string;
  keterangan: string;
  nominal: number;
  createdAt: string;
  updatedAt: string;
};

const initialForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  kategori: "Operasional" as KategoriPengeluaran,
  nomorNota: "",
  keterangan: "",
  nominal: "",
};

function formatCurrency(value: number | string) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(/[^0-9]/g, ""));
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
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

function normalizeNominal(value: string) {
  return Number(String(value).replace(/[^0-9]/g, ""));
}

export default function PengeluaranKasPage() {
  const [form, setForm] = useState(initialForm);
  const [records, setRecords] = useState<PengeluaranKasRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalPengeluaran = useMemo(
    () => records.reduce((sum, record) => sum + (record.nominal || 0), 0),
    [records],
  );

  useEffect(() => {
    const q = query(collection(db, "pengeluaran_kas"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<PengeluaranKasRecord, "id">),
        }));
        setRecords(data);
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Gagal memuat data pengeluaran kas:", snapshotError);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof typeof initialForm, value: string) => {
    if (field === "nominal") {
      const numericValue = normalizeNominal(value);
      setForm((current) => ({ ...current, nominal: numericValue > 0 ? formatCurrency(numericValue) : "" }));
      return;
    }

    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setError("");
  };

  const validateForm = () => {
    if (!form.tanggal.trim()) return "Tanggal wajib diisi.";
    if (!form.keterangan.trim()) return "Keterangan lengkap wajib diisi.";
    const nominal = normalizeNominal(form.nominal);
    if (Number.isNaN(nominal) || nominal <= 0) return "Nominal harus lebih besar dari 0.";
    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSaving(true);

    try {
      const payload: Omit<PengeluaranKasRecord, "id"> = {
        tanggal: form.tanggal,
        kategori: form.kategori,
        keterangan: form.keterangan.trim(),
        nominal: normalizeNominal(form.nominal),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (form.nomorNota.trim()) {
        (payload as { nomorNota: string }).nomorNota = form.nomorNota.trim();
      }

      await addDoc(collection(db, "pengeluaran_kas"), payload);
      resetForm();
    } catch (submitError) {
      console.error("Gagal menyimpan pengeluaran kas:", submitError);
      setError("Terjadi kesalahan saat menyimpan data. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Pengeluaran Kas</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Catat dan pantau semua pengeluaran.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Simpan data pengeluaran ke satu koleksi Firestore, dengan ringkasan total dan tabel pengeluaran terpusat.</p>
          </div>
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-right">
            <p className="text-sm uppercase tracking-[0.24em] text-rose-700">Total Pengeluaran</p>
            <p className="mt-3 text-4xl font-semibold text-rose-950">{formatCurrency(totalPengeluaran)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Form Pengeluaran</h2>
          <p className="mt-1 text-sm text-slate-600">Isi detail pengeluaran untuk disimpan ke database.</p>
          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => handleChange("tanggal", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Kategori Pengeluaran</label>
              <select
                value={form.kategori}
                onChange={(event) => handleChange("kategori", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              >
                {kategoriOptions.map((kategori) => (
                  <option key={kategori} value={kategori}>{kategori}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nomor Nota / Referensi</label>
              <input
                type="text"
                value={form.nomorNota}
                onChange={(event) => handleChange("nomorNota", event.target.value)}
                placeholder="Opsional"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Keterangan Lengkap</label>
              <textarea
                value={form.keterangan}
                onChange={(event) => handleChange("keterangan", event.target.value)}
                placeholder="Jelaskan rincian pengeluaran"
                rows={4}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nominal</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.nominal}
                onChange={(event) => handleChange("nominal", event.target.value)}
                placeholder="Rp 0"
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
              />
            </div>

            {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-full bg-rose-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Menyimpan..." : "Simpan Pengeluaran"}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Daftar Pengeluaran</h2>
              <p className="text-sm text-slate-600">Data pengeluaran terakhir ditampilkan di sini.</p>
            </div>
            <p className="text-sm font-semibold text-slate-900">Total entri: {records.length}</p>
          </div>

          {loading ? (
            <p className="text-sm text-slate-600">Memuat data...</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-600">Belum ada pengeluaran yang dicatat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Kategori</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">No. Nota</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {records.map((record) => (
                    <tr key={record.id} className="bg-white">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(record.tanggal)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.kategori}</td>
                      <td className="px-4 py-3 text-slate-700">{record.keterangan}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.nomorNota || "-"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(record.nominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
