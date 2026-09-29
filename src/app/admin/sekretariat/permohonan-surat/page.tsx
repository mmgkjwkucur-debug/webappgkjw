"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

const TABS = ["Masuk", "Keluar"] as const;

type TabType = (typeof TABS)[number];

type ArsipSurat = {
  id: string;
  jenis_surat: TabType;
  nomorSurat: string;
  tanggalSurat: Date;
  tanggalDiterima?: Date;
  tanggalDikirim?: Date;
  pengirim?: string;
  tujuan?: string;
  perihal: string;
  keterangan?: string;
  createdAt?: Date;
};

const todayDate = new Date().toISOString().slice(0, 10);

function formatDate(value?: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function parseDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate();
  }
  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function PermohonanSuratPage() {
  const [activeTab, setActiveTab] = useState<TabType>("Masuk");
  const [arsipList, setArsipList] = useState<ArsipSurat[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formMasuk, setFormMasuk] = useState({
    nomorSurat: "",
    tanggalSurat: todayDate,
    tanggalDiterima: todayDate,
    pengirim: "",
    perihal: "",
    keterangan: "",
  });

  const [formKeluar, setFormKeluar] = useState({
    nomorSurat: "",
    tanggalDikirim: todayDate,
    tujuan: "",
    perihal: "",
    keterangan: "",
  });

  useEffect(() => {
    const suratQuery = query(collection(db, "arsip_surat"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(suratQuery, (snapshot) => {
      setArsipList(
        snapshot.docs
          .map((doc) => {
            const data = doc.data() as DocumentData;
            const tanggalSurat = parseDate(data.tanggalSurat);
            const tanggalDiterima = parseDate(data.tanggalDiterima);
            const tanggalDikirim = parseDate(data.tanggalDikirim);
            if (!tanggalSurat) return null;

            return {
              id: doc.id,
              jenis_surat: data.jenis_surat === "Keluar" ? "Keluar" : "Masuk",
              nomorSurat: data.nomorSurat || "-",
              tanggalSurat,
              tanggalDiterima: tanggalDiterima ?? undefined,
              tanggalDikirim: tanggalDikirim ?? undefined,
              pengirim: data.pengirim || "-",
              tujuan: data.tujuan || "-",
              perihal: data.perihal || "-",
              keterangan: data.keterangan || "-",
              createdAt: parseDate(data.createdAt),
            } as ArsipSurat;
          })
          .filter((item): item is ArsipSurat => Boolean(item)),
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredArsip = useMemo(
    () => arsipList.filter((item) => item.jenis_surat === activeTab),
    [arsipList, activeTab],
  );

  const isMasuk = activeTab === "Masuk";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      jenis_surat: activeTab,
      nomorSurat: (isMasuk ? formMasuk.nomorSurat : formKeluar.nomorSurat).trim(),
      tanggalSurat: parseDate(isMasuk ? formMasuk.tanggalSurat : formKeluar.tanggalDikirim) ?? new Date(),
      perihal: (isMasuk ? formMasuk.perihal : formKeluar.perihal).trim(),
      keterangan: (isMasuk ? formMasuk.keterangan : formKeluar.keterangan).trim(),
      createdAt: serverTimestamp(),
    };

    if (isMasuk) {
      payload.tanggalDiterima = parseDate(formMasuk.tanggalDiterima) ?? new Date();
      payload.pengirim = formMasuk.pengirim.trim();
    } else {
      payload.tanggalDikirim = parseDate(formKeluar.tanggalDikirim) ?? new Date();
      payload.tujuan = formKeluar.tujuan.trim();
    }

    if (!payload.nomorSurat || !payload.perihal) {
      alert("Nomor surat dan perihal wajib diisi.");
      return;
    }

    if (isMasuk && !payload.pengirim) {
      alert("Pengirim / Asal Surat wajib diisi untuk Surat Masuk.");
      return;
    }

    if (!isMasuk && !payload.tujuan) {
      alert("Tujuan Surat wajib diisi untuk Surat Keluar.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "arsip_surat"), payload);
      if (isMasuk) {
        setFormMasuk({
          nomorSurat: "",
          tanggalSurat: todayDate,
          tanggalDiterima: todayDate,
          pengirim: "",
          perihal: "",
          keterangan: "",
        });
      } else {
        setFormKeluar({
          nomorSurat: "",
          tanggalDikirim: todayDate,
          tujuan: "",
          perihal: "",
          keterangan: "",
        });
      }
      alert(`Surat ${activeTab} berhasil disimpan.`);
    } catch (error) {
      console.error("Gagal menyimpan arsip surat:", error);
      alert("Terjadi kesalahan saat menyimpan data. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Sekretariat & Surat Menyurat</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Arsip Surat Masuk dan Keluar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Kelola surat masuk dan surat keluar dalam satu arsip Firestore dengan tab terpisah dan tabel ringkas.</p>
          </div>
          <Link
            href="/admin/sekretariat"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-white"
          >
            Kembali ke Sekretariat
          </Link>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-950 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Surat {tab}
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Form Input</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Tambah Surat {activeTab}</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Nomor Surat</span>
                  <input
                    type="text"
                    value={isMasuk ? formMasuk.nomorSurat : formKeluar.nomorSurat}
                    onChange={(event) =>
                      isMasuk
                        ? setFormMasuk((prev) => ({ ...prev, nomorSurat: event.target.value }))
                        : setFormKeluar((prev) => ({ ...prev, nomorSurat: event.target.value }))
                    }
                    placeholder="Contoh: 123/SM/2026"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">{isMasuk ? "Tanggal Surat" : "Tanggal Dikirim"}</span>
                  <input
                    type="date"
                    value={isMasuk ? formMasuk.tanggalSurat : formKeluar.tanggalDikirim}
                    onChange={(event) =>
                      isMasuk
                        ? setFormMasuk((prev) => ({ ...prev, tanggalSurat: event.target.value }))
                        : setFormKeluar((prev) => ({ ...prev, tanggalDikirim: event.target.value }))
                    }
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              {isMasuk ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Tanggal Diterima</span>
                    <input
                      type="date"
                      value={formMasuk.tanggalDiterima}
                      onChange={(event) => setFormMasuk((prev) => ({ ...prev, tanggalDiterima: event.target.value }))}
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-medium">Pengirim / Asal Surat</span>
                    <input
                      type="text"
                      value={formMasuk.pengirim}
                      onChange={(event) => setFormMasuk((prev) => ({ ...prev, pengirim: event.target.value }))}
                      placeholder="Nama atau instansi pengirim"
                      className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>
                </div>
              ) : (
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Tujuan Surat</span>
                  <input
                    type="text"
                    value={formKeluar.tujuan}
                    onChange={(event) => setFormKeluar((prev) => ({ ...prev, tujuan: event.target.value }))}
                    placeholder="Nama lembaga atau instansi tujuan"
                    className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              )}

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Perihal</span>
                <input
                  type="text"
                  value={isMasuk ? formMasuk.perihal : formKeluar.perihal}
                  onChange={(event) =>
                    isMasuk
                      ? setFormMasuk((prev) => ({ ...prev, perihal: event.target.value }))
                      : setFormKeluar((prev) => ({ ...prev, perihal: event.target.value }))
                  }
                  placeholder="Ringkas perihal surat"
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Keterangan {isMasuk ? "/ Disposisi" : "Tambahan"}</span>
                <textarea
                  rows={4}
                  value={isMasuk ? formMasuk.keterangan : formKeluar.keterangan}
                  onChange={(event) =>
                    isMasuk
                      ? setFormMasuk((prev) => ({ ...prev, keterangan: event.target.value }))
                      : setFormKeluar((prev) => ({ ...prev, keterangan: event.target.value }))
                  }
                  placeholder={isMasuk ? "Catatan atau disposisi surat" : "Catatan tambahan untuk surat keluar"}
                  className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Menyimpan..." : `Simpan Surat ${activeTab}`}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Tabel Arsip</p>
              <h2 className="mt-2 text-lg font-semibold text-gray-800">Surat {activeTab}</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    {isMasuk ? (
                      <>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tgl Terima</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tgl Surat</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nomor Surat</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Pengirim</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Perihal</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                      </>
                    ) : (
                      <>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tgl Kirim</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Nomor Surat</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tujuan</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Perihal</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {loading ? (
                    [...Array(3)].map((_, index) => (
                      <tr key={index} className="animate-pulse">
                        <td className="px-4 py-4 text-slate-400">&nbsp;</td>
                        <td className="px-4 py-4 text-slate-400">&nbsp;</td>
                        <td className="px-4 py-4 text-slate-400">&nbsp;</td>
                        <td className="px-4 py-4 text-slate-400">&nbsp;</td>
                        <td className="px-4 py-4 text-slate-400">&nbsp;</td>
                        {isMasuk ? <td className="px-4 py-4 text-slate-400">&nbsp;</td> : null}
                      </tr>
                    ))
                  ) : filteredArsip.length > 0 ? (
                    filteredArsip.map((surat) => (
                      <tr key={surat.id} className="hover:bg-slate-50">
                        {isMasuk ? (
                          <>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(surat.tanggalDiterima)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(surat.tanggalSurat)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700">{surat.nomorSurat}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.pengirim}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.perihal}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.keterangan}</td>
                          </>
                        ) : (
                          <>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700">{formatDate(surat.tanggalDikirim)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-slate-700">{surat.nomorSurat}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.tujuan}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.perihal}</td>
                            <td className="px-4 py-4 text-slate-700">{surat.keterangan}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isMasuk ? 6 : 5} className="px-4 py-8 text-center text-sm text-slate-500">
                        Belum ada data surat {activeTab.toLowerCase()}.
                      </td>
                    </tr>
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
