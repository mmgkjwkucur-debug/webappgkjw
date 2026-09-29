"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

type TabKey = "ibadah" | "persepuluhan" | "donatur";

type PenerimaanKasRecord = {
  id: string;
  tanggal: string;
  nominal: number;
  kategori_penerimaan: string;
  jenis_ibadah?: string;
  keterangan?: string;
  nama_jemaat?: string;
  jenis?: string;
  doa_keterangan?: string;
  nama_donatur?: string;
  tujuan?: string;
  createdAt: string;
  updatedAt: string;
};

const tabLabels: Record<TabKey, string> = {
  ibadah: "Persembahan Ibadah",
  persepuluhan: "Persepuluhan & Syukur",
  donatur: "Sumbangan Khusus",
};

const initialForm = {
  tanggal: "",
  jenisIbadah: "",
  keterangan: "",
  nominal: "",
  namaJemaat: "",
  jenis: "",
  doaKeterangan: "",
  namaDonatur: "",
  tujuan: "",
};

function formatCurrency(value: number | string) {
  const amount = typeof value === "number" ? value : Number(String(value).replace(/[\D]/g, ""));
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

function parseNominal(value: string) {
  const cleaned = String(value).replace(/[\D]/g, "");
  return cleaned ? Number(cleaned) : NaN;
}

export default function PenerimaanKasPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("ibadah");
  const [records, setRecords] = useState<PenerimaanKasRecord[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalKas = useMemo(
    () => records.reduce((sum, record) => sum + (record.nominal || 0), 0),
    [records],
  );

  const filteredRecords = useMemo(() => {
    const kategori = tabLabels[activeTab];
    return records.filter((record) => record.kategori_penerimaan === kategori);
  }, [activeTab, records]);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(query(collection(db, "penerimaan_kas"), orderBy("createdAt", "desc")));
        const data = snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<PenerimaanKasRecord, "id">),
        }));
        setRecords(data);
      } catch (error) {
        console.error("Gagal memuat data penerimaan kas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, []);

  const handleInput = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setError("");
  };

  const validateForm = () => {
    if (!form.tanggal.trim()) return "Tanggal wajib diisi.";
    const nominal = parseNominal(form.nominal);
    if (Number.isNaN(nominal) || nominal <= 0) return "Nominal harus lebih besar dari 0.";

    if (activeTab === "ibadah") {
      if (!form.jenisIbadah.trim()) return "Jenis Ibadah wajib diisi.";
    }

    if (activeTab === "persepuluhan") {
      if (!form.namaJemaat.trim()) return "Nama Jemaat wajib diisi.";
      if (!form.jenis.trim()) return "Jenis wajib diisi.";
    }

    if (activeTab === "donatur") {
      if (!form.namaDonatur.trim()) return "Nama Donatur wajib diisi.";
      if (!form.tujuan.trim()) return "Tujuan wajib diisi.";
    }

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
      const kategori = tabLabels[activeTab];
      const payload: Omit<PenerimaanKasRecord, "id"> = {
        tanggal: form.tanggal,
        nominal: parseNominal(form.nominal),
        kategori_penerimaan: kategori,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (activeTab === "ibadah") {
        payload.jenis_ibadah = form.jenisIbadah.trim();
        payload.keterangan = form.keterangan.trim();
      }

      if (activeTab === "persepuluhan") {
        payload.nama_jemaat = form.namaJemaat.trim();
        payload.jenis = form.jenis.trim();
        payload.doa_keterangan = form.doaKeterangan.trim();
      }

      if (activeTab === "donatur") {
        payload.nama_donatur = form.namaDonatur.trim();
        payload.tujuan = form.tujuan.trim();
        payload.keterangan = form.keterangan.trim();
      }

      const docRef = await addDoc(collection(db, "penerimaan_kas"), payload);
      setRecords((current) => [{ id: docRef.id, ...payload }, ...current]);
      resetForm();
    } catch (error) {
      console.error("Gagal menyimpan data penerimaan kas:", error);
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
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Penerimaan Kas</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Dashboard Penerimaan Kas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Catat semua jenis penerimaan kas di satu halaman dengan tab khusus per kategori.</p>
          </div>
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-6 text-right">
            <p className="text-sm uppercase tracking-[0.24em] text-emerald-700">Total Seluruh Kas Masuk</p>
            <p className="mt-3 text-4xl font-semibold text-emerald-950">{formatCurrency(totalKas)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Kategori Penerimaan</h2>
            <p className="mt-1 text-sm text-slate-600">Pilih tab untuk mengelola jenis penerimaan kas yang berbeda.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setError("");
                resetForm();
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-emerald-950 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Tanggal</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(event) => handleInput("tanggal", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Nominal</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={form.nominal}
                onChange={(event) => handleInput("nominal", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="0"
              />
            </div>
          </div>

          {activeTab === "ibadah" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Jenis Ibadah</label>
                <input
                  type="text"
                  value={form.jenisIbadah}
                  onChange={(event) => handleInput("jenisIbadah", event.target.value)}
                  placeholder="Contoh: Ibadah Minggu"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(event) => handleInput("keterangan", event.target.value)}
                  placeholder="Contoh: Persembahan Ibadah Natal"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          )}

          {activeTab === "persepuluhan" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Jemaat</label>
                <input
                  type="text"
                  value={form.namaJemaat}
                  onChange={(event) => handleInput("namaJemaat", event.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Jenis</label>
                <input
                  type="text"
                  value={form.jenis}
                  onChange={(event) => handleInput("jenis", event.target.value)}
                  placeholder="Contoh: Persepuluhan"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Doa / Keterangan</label>
                <input
                  type="text"
                  value={form.doaKeterangan}
                  onChange={(event) => handleInput("doaKeterangan", event.target.value)}
                  placeholder="Contoh: Doa syukur atas berkat panen"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          )}

          {activeTab === "donatur" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Nama Donatur</label>
                <input
                  type="text"
                  value={form.namaDonatur}
                  onChange={(event) => handleInput("namaDonatur", event.target.value)}
                  placeholder="Contoh: Ibu Siti"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Tujuan</label>
                <input
                  type="text"
                  value={form.tujuan}
                  onChange={(event) => handleInput("tujuan", event.target.value)}
                  placeholder="Contoh: Bantuan renovasi gereja"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-slate-700">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(event) => handleInput("keterangan", event.target.value)}
                  placeholder="Contoh: Sumbangan untuk program beasiswa"
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          )}

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Menyimpan..." : "Simpan Penerimaan"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Reset Form
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Riwayat {tabLabels[activeTab]}</h2>
            <p className="text-sm text-slate-600">Menampilkan semua catatan yang sudah tersimpan untuk kategori ini.</p>
          </div>
          <div className="text-sm text-slate-500">Total: {filteredRecords.length} entri</div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Memuat data...</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-sm text-slate-600">Belum ada data pada kategori ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                  {activeTab === "ibadah" && <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Jenis Ibadah</th>}
                  {activeTab === "persepuluhan" && <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nama Jemaat</th>}
                  {activeTab === "donatur" && <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nama Donatur</th>}
                  {activeTab !== "ibadah" && <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Jenis</th>}
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="bg-white">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(record.tanggal)}</td>
                    {activeTab === "ibadah" && (
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.jenis_ibadah ?? "-"}</td>
                    )}
                    {activeTab === "persepuluhan" && (
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.nama_jemaat ?? "-"}</td>
                    )}
                    {activeTab === "donatur" && (
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.nama_donatur ?? "-"}</td>
                    )}
                    {activeTab !== "ibadah" && (
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{record.jenis ?? "-"}</td>
                    )}
                    <td className="px-4 py-3 text-slate-700">{activeTab === "persepuluhan" ? record.doa_keterangan || "-" : record.keterangan || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(record.nominal)}</td>
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
