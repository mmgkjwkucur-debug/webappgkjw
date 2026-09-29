"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TABS = ["Pemasukan", "Pengeluaran", "Mutasi"] as const;
const DOMPET_OPTIONS = ["Kas Tunai", "Rekening Bank"] as const;

type TabType = (typeof TABS)[number];

type DompetType = (typeof DOMPET_OPTIONS)[number];

type KategoriRecord = {
  id: string;
  nama_kategori: string;
  tipe: "Pemasukan" | "Pengeluaran";
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default function InputTransaksiPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Pemasukan");
  const [kategoriList, setKategoriList] = useState<KategoriRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formPemasukan, setFormPemasukan] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "",
    dompet: "Kas Tunai" as DompetType,
    nominal: "",
    keterangan: "",
  });

  const [formPengeluaran, setFormPengeluaran] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "",
    dompet: "Kas Tunai" as DompetType,
    nominal: "",
    keterangan: "",
  });

  const [formMutasi, setFormMutasi] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    dariDompet: "Kas Tunai" as DompetType,
    keDompet: "Rekening Bank" as DompetType,
    nominal: "",
    keterangan: "",
  });

  useEffect(() => {
    const kategoriQuery = query(collection(db, "kategori_keuangan"), orderBy("nama_kategori", "asc"));
    const unsubscribe = onSnapshot(kategoriQuery, (snapshot) => {
      const items: KategoriRecord[] = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          return {
              id: doc.id,
              nama_kategori: data.nama_kategori as string,
              tipe: (data.tipe === "Pengeluaran" ? "Pengeluaran" : "Pemasukan") as "Pemasukan" | "Pengeluaran",
            };
        })
        .filter((item) => item.nama_kategori);
      setKategoriList(items);
    });

    return () => unsubscribe();
  }, []);

  const pemasukanKategori = useMemo(
    () => kategoriList.filter((item) => item.tipe === "Pemasukan"),
    [kategoriList],
  );

  const pengeluaranKategori = useMemo(
    () => kategoriList.filter((item) => item.tipe === "Pengeluaran"),
    [kategoriList],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    let payload: Record<string, unknown> = {
      tanggal: new Date(),
      jenis_transaksi: activeTab,
      dompet_penyimpanan: "",
      nama_kategori: "",
      nominal: 0,
      keterangan: "",
    };

    if (activeTab === "Pemasukan") {
      payload = {
        ...payload,
        tanggal: new Date(formPemasukan.tanggal),
        dompet_penyimpanan: formPemasukan.dompet,
        nama_kategori: formPemasukan.kategori,
        nominal: Number(formPemasukan.nominal.replace(/[^0-9]/g, "")) || 0,
        keterangan: formPemasukan.keterangan.trim(),
      };
    }

    if (activeTab === "Pengeluaran") {
      payload = {
        ...payload,
        tanggal: new Date(formPengeluaran.tanggal),
        dompet_penyimpanan: formPengeluaran.dompet,
        nama_kategori: formPengeluaran.kategori,
        nominal: Number(formPengeluaran.nominal.replace(/[^0-9]/g, "")) || 0,
        keterangan: formPengeluaran.keterangan.trim(),
      };
    }

    if (activeTab === "Mutasi") {
      if (formMutasi.dariDompet === formMutasi.keDompet) {
        alert("Dompet asal dan tujuan harus berbeda untuk mutasi.");
        return;
      }
      payload = {
        ...payload,
        tanggal: new Date(formMutasi.tanggal),
        dompet_penyimpanan: `${formMutasi.dariDompet} → ${formMutasi.keDompet}`,
        nama_kategori: "Mutasi",
        nominal: Number(formMutasi.nominal.replace(/[^0-9]/g, "")) || 0,
        keterangan: formMutasi.keterangan.trim(),
      };
    }

    if (!payload.nama_kategori || payload.nominal === 0) {
      alert("Kategori dan nominal wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "transaksi_keuangan"), payload);
      setSuccessMessage(`Transaksi ${activeTab} berhasil disimpan.`);
      if (activeTab === "Pemasukan") {
        setFormPemasukan({
          tanggal: new Date().toISOString().slice(0, 10),
          kategori: "",
          dompet: "Kas Tunai",
          nominal: "",
          keterangan: "",
        });
      }
      if (activeTab === "Pengeluaran") {
        setFormPengeluaran({
          tanggal: new Date().toISOString().slice(0, 10),
          kategori: "",
          dompet: "Kas Tunai",
          nominal: "",
          keterangan: "",
        });
      }
      if (activeTab === "Mutasi") {
        setFormMutasi({
          tanggal: new Date().toISOString().slice(0, 10),
          dariDompet: "Kas Tunai",
          keDompet: "Rekening Bank",
          nominal: "",
          keterangan: "",
        });
      }
    } catch (error) {
      console.error("Gagal menyimpan transaksi:", error);
      alert("Terjadi kesalahan saat menyimpan transaksi. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Input Transaksi Terpadu</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Modul Bendahara Akuntansi Mini</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Simpan semua transaksi ke satu collection Firestore dengan tab untuk pemasukan, pengeluaran, dan mutasi.</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setSuccessMessage(null);
                  }}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-emerald-950 text-white" : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {successMessage ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{successMessage}</div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Tanggal</span>
                  <input
                    type="date"
                    value={activeTab === "Pemasukan" ? formPemasukan.tanggal : activeTab === "Pengeluaran" ? formPengeluaran.tanggal : formMutasi.tanggal}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (activeTab === "Pemasukan") setFormPemasukan((prev) => ({ ...prev, tanggal: value }));
                      if (activeTab === "Pengeluaran") setFormPengeluaran((prev) => ({ ...prev, tanggal: value }));
                      if (activeTab === "Mutasi") setFormMutasi((prev) => ({ ...prev, tanggal: value }));
                    }}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                {activeTab !== "Mutasi" ? (
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Kategori</span>
                    <select
                      value={activeTab === "Pemasukan" ? formPemasukan.kategori : formPengeluaran.kategori}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (activeTab === "Pemasukan") setFormPemasukan((prev) => ({ ...prev, kategori: value }));
                        if (activeTab === "Pengeluaran") setFormPengeluaran((prev) => ({ ...prev, kategori: value }));
                      }}
                      className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="">Pilih kategori</option>
                      {(activeTab === "Pemasukan" ? pemasukanKategori : pengeluaranKategori).map((kategori) => (
                        <option key={kategori.id} value={kategori.nama_kategori}>
                          {kategori.nama_kategori}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Dari Dompet</span>
                      <select
                        value={formMutasi.dariDompet}
                        onChange={(event) => setFormMutasi((prev) => ({ ...prev, dariDompet: event.target.value as DompetType }))}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      >
                        {DOMPET_OPTIONS.map((dompet) => (
                          <option key={dompet} value={dompet}>
                            {dompet}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 text-sm text-slate-700">
                      <span className="font-medium">Ke Dompet</span>
                      <select
                        value={formMutasi.keDompet}
                        onChange={(event) => setFormMutasi((prev) => ({ ...prev, keDompet: event.target.value as DompetType }))}
                        className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      >
                        {DOMPET_OPTIONS.map((dompet) => (
                          <option key={dompet} value={dompet}>
                            {dompet}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              {activeTab !== "Mutasi" ? (
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">{activeTab === "Pemasukan" ? "Simpan Ke" : "Ambil Dari"}</span>
                  <select
                    value={activeTab === "Pemasukan" ? formPemasukan.dompet : formPengeluaran.dompet}
                    onChange={(event) => {
                      const value = event.target.value as DompetType;
                      if (activeTab === "Pemasukan") setFormPemasukan((prev) => ({ ...prev, dompet: value }));
                      if (activeTab === "Pengeluaran") setFormPengeluaran((prev) => ({ ...prev, dompet: value }));
                    }}
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  >
                    {DOMPET_OPTIONS.map((dompet) => (
                      <option key={dompet} value={dompet}>
                        {dompet}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Nominal</span>
                  <input
                    type="text"
                    value={activeTab === "Pemasukan" ? formPemasukan.nominal : activeTab === "Pengeluaran" ? formPengeluaran.nominal : formMutasi.nominal}
                    onChange={(event) => {
                      const value = event.target.value.replace(/[^0-9]/g, "");
                      if (activeTab === "Pemasukan") setFormPemasukan((prev) => ({ ...prev, nominal: value }));
                      if (activeTab === "Pengeluaran") setFormPengeluaran((prev) => ({ ...prev, nominal: value }));
                      if (activeTab === "Mutasi") setFormMutasi((prev) => ({ ...prev, nominal: value }));
                    }}
                    placeholder="0"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <div className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Preview Nominal</span>
                  <div className="rounded-3xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-900">
                    {formatRupiah(Number(activeTab === "Pemasukan" ? formPemasukan.nominal : activeTab === "Pengeluaran" ? formPengeluaran.nominal : formMutasi.nominal) || 0)}
                  </div>
                </div>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Keterangan</span>
                <textarea
                  rows={4}
                  value={activeTab === "Pemasukan" ? formPemasukan.keterangan : activeTab === "Pengeluaran" ? formPengeluaran.keterangan : formMutasi.keterangan}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (activeTab === "Pemasukan") setFormPemasukan((prev) => ({ ...prev, keterangan: value }));
                    if (activeTab === "Pengeluaran") setFormPengeluaran((prev) => ({ ...prev, keterangan: value }));
                    if (activeTab === "Mutasi") setFormMutasi((prev) => ({ ...prev, keterangan: value }));
                  }}
                  placeholder="Tambahkan catatan transaksi"
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-3xl bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
