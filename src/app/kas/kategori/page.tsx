"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TIPE_OPTIONS = ["Pemasukan", "Pengeluaran"] as const;

type TipeKategori = (typeof TIPE_OPTIONS)[number];

type KategoriRecord = {
  id: string;
  nama_kategori: string;
  tipe: TipeKategori;
};

export default function KategoriKeuanganPage() {
  const [kategoriList, setKategoriList] = useState<KategoriRecord[]>([]);
  const [namaKategori, setNamaKategori] = useState("");
  const [tipeKategori, setTipeKategori] = useState<TipeKategori>("Pemasukan");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const kategoriQuery = query(collection(db, "kategori_keuangan"), orderBy("nama_kategori", "asc"));
    const unsubscribe = onSnapshot(kategoriQuery, (snapshot) => {
      const items: KategoriRecord[] = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          nama_kategori: (data.nama_kategori as string) ?? "",
          tipe: (data.tipe as TipeKategori) ?? "Pemasukan",
        };
      });
      setKategoriList(items);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const sortedKategori = useMemo(
    () => [...kategoriList].sort((a, b) => a.nama_kategori.localeCompare(b.nama_kategori)),
    [kategoriList],
  );

  const handleSimpan = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!namaKategori.trim()) {
      alert("Nama kategori wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "kategori_keuangan"), {
        nama_kategori: namaKategori.trim(),
        tipe: tipeKategori,
        createdAt: new Date(),
      });
      setNamaKategori("");
      setTipeKategori("Pemasukan");
      alert("Kategori keuangan berhasil ditambahkan.");
    } catch (error) {
      console.error("Gagal menyimpan kategori:", error);
      alert("Terjadi kesalahan saat menyimpan kategori. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Hapus kategori ini? Tindakan tidak bisa dibatalkan.");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "kategori_keuangan", id));
      alert("Kategori berhasil dihapus.");
    } catch (error) {
      console.error("Gagal menghapus kategori:", error);
      alert("Terjadi kesalahan saat menghapus kategori.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Master Kategori Keuangan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Kelola kategori pemasukan dan pengeluaran</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Tambahkan kategori baru untuk digunakan di halaman input transaksi terpadu.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <form onSubmit={handleSimpan} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-slate-700">Tambah Kategori Baru</p>
                <p className="mt-1 text-sm text-slate-500">Nama kategori dan tipe transaksi.</p>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Nama Kategori</span>
                <input
                  type="text"
                  value={namaKategori}
                  onChange={(event) => setNamaKategori(event.target.value)}
                  placeholder="Contoh: Persembahan, Operasional"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Tipe Kategori</span>
                <select
                  value={tipeKategori}
                  onChange={(event) => setTipeKategori(event.target.value as TipeKategori)}
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {TIPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-3xl bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Menyimpan..." : "Simpan Kategori"}
              </button>
            </div>
          </form>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Daftar Kategori</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Kategori Keuangan</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nama Kategori</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tipe</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                        Memuat kategori...
                      </td>
                    </tr>
                  ) : sortedKategori.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                        Belum ada kategori. Tambahkan kategori baru di samping.
                      </td>
                    </tr>
                  ) : (
                    sortedKategori.map((kategori) => (
                      <tr key={kategori.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-slate-700">{kategori.nama_kategori}</td>
                        <td className="px-4 py-4 text-slate-700">{kategori.tipe}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(kategori.id)}
                            className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
