"use client";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { QRCodeCanvas } from "qrcode.react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { Search, Plus, Eye, Edit2, Trash2 } from "lucide-react";

type Jemaat = {
  id: string;
  nik?: string;
  nkk?: string;
  nama?: string;
  tanggalLahir?: string;
  tanggalBaptis?: string;
  jenisKelamin?: string;
  statusPerkawinan?: string;
  alamat?: string;
  rtRt?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  nomorHp?: string;
  email?: string;
  umur?: number;
  kategoriUsia?: string;
  pinPoint?: string;
  status?: string;
};

const initialForm = {
  nik: "",
  nkk: "",
  nama: "",
  tanggalLahir: "",
  tanggalBaptis: "",
  jenisKelamin: "",
  statusPerkawinan: "",
  alamat: "",
  rtRt: "",
  desaKelurahan: "",
  kecamatan: "",
  nomorHp: "",
  email: "",
  umur: 0,
  kategoriUsia: "",
  pinPoint: "",
};

export default function JemaatPage() {
  const [jemaat, setJemaat] = useState<Jemaat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState<Jemaat | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrItem, setQrItem] = useState<Jemaat | null>(null);
  const [nikError, setNikError] = useState("");
  const [duplicateNikOwner, setDuplicateNikOwner] = useState<Jemaat | null>(null);

  const normalizeDateString = (value: unknown) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
      return (value as any).toDate().toISOString().slice(0, 10);
    }
    return "";
  };

  const fetchData = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, "data_induk"), orderBy("nama", "asc")));
      const data = querySnapshot.docs.map((document) => {
        const raw = document.data();
        return {
          id: document.id,
          ...raw,
          tanggalLahir: normalizeDateString(raw.tanggalLahir),
          tanggalBaptis: normalizeDateString(raw.tanggalBaptis),
          umur: typeof raw.umur === "number" ? raw.umur : raw.umur ? Number(raw.umur) : undefined,
          kategoriUsia: typeof raw.kategoriUsia === "string" ? raw.kategoriUsia : "",
        } as Jemaat;
      });
      setJemaat(data);
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const isNikDuplicate = useMemo(() => {
    const trimmedNik = form.nik.trim().toLowerCase();
    if (!trimmedNik) {
      return false;
    }

    return jemaat.some((item) => item.id !== editingId && (item.nik ?? "").trim().toLowerCase() === trimmedNik);
  }, [editingId, form.nik, jemaat]);

  useEffect(() => {
    if (!form.nik.trim()) {
      setNikError("");
      setDuplicateNikOwner(null);
      return;
    }

    const owner = jemaat.find((item) => item.id !== editingId && (item.nik ?? "").trim().toLowerCase() === form.nik.trim().toLowerCase()) ?? null;

    if (owner) {
      const ownerName = owner.nama?.trim() || "nama belum tercatat";
      setDuplicateNikOwner(owner);
      setNikError(`NIK ini sudah terdaftar atas nama ${ownerName}. Silakan gunakan NIK lain.`);
    } else {
      setDuplicateNikOwner(null);
      setNikError("");
    }
  }, [editingId, form.nik, jemaat]);

  useEffect(() => {
    if (!form.tanggalLahir) {
      setForm((current) => ({ ...current, umur: 0, kategoriUsia: "" }));
      return;
    }

    const birthDate = new Date(form.tanggalLahir);
    if (Number.isNaN(birthDate.getTime())) {
      setForm((current) => ({ ...current, umur: 0, kategoriUsia: "" }));
      return;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }

    const category =
      age >= 60 ? "Lansia" :
      age >= 31 ? "Dewasa" :
      age >= 18 ? "Pemuda" :
      age >= 13 ? "Remaja" :
      age >= 6 ? "Anak-anak" :
      age >= 0 ? "Balita" : "";

    setForm((current) => ({ ...current, umur: age, kategoriUsia: category }));
  }, [form.tanggalLahir]);

  const resetForm = () => {
    setForm({ ...initialForm });
    setEditingId(null);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const openAddForm = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditForm = (item: Jemaat) => {
    setEditingId(item.id);
    setForm({
      nik: item.nik ?? "",
      nkk: item.nkk ?? "",
      nama: item.nama ?? "",
      tanggalLahir: item.tanggalLahir ?? "",
      tanggalBaptis: item.tanggalBaptis ?? "",
      jenisKelamin: item.jenisKelamin ?? "",
      statusPerkawinan: item.statusPerkawinan ?? "",
      alamat: item.alamat ?? "",
      rtRt: item.rtRt ?? "",
      desaKelurahan: item.desaKelurahan ?? "",
      kecamatan: item.kecamatan ?? "",
      nomorHp: item.nomorHp ?? "",
      email: item.email ?? "",
      umur: item.umur ?? 0,
      kategoriUsia: item.kategoriUsia ?? "",
      pinPoint: item.pinPoint ?? "",
    });
    setShowFormModal(true);
  };

  const openDetailModal = (item: Jemaat) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.nama.trim() || !form.nik.trim()) {
      alert("NIK dan nama wajib diisi.");
      return;
    }

    if (isNikDuplicate) {
      const ownerName = duplicateNikOwner?.nama?.trim() || "nama belum tercatat";
      alert(`NIK sudah terdaftar atas nama ${ownerName}. Silakan gunakan NIK lain sebelum melanjutkan.`);
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nik: form.nik.trim(),
        nkk: form.nkk.trim(),
        nama: form.nama.trim(),
        jenisKelamin: form.jenisKelamin.trim(),
        statusPerkawinan: form.statusPerkawinan.trim(),
        alamat: form.alamat.trim(),
        rtRt: form.rtRt.trim(),
        desaKelurahan: form.desaKelurahan.trim(),
        kecamatan: form.kecamatan.trim(),
        nomorHp: form.nomorHp.trim(),
        email: form.email.trim(),
        kategoriUsia: form.kategoriUsia.trim(),
        pinPoint: form.pinPoint.trim(),
      };

      if (form.tanggalLahir) {
        payload.tanggalLahir = new Date(form.tanggalLahir);
      }
      if (form.tanggalBaptis) {
        payload.tanggalBaptis = new Date(form.tanggalBaptis);
      }
      if (typeof form.umur === "number") {
        payload.umur = form.umur;
      }

      if (editingId) {
        await updateDoc(doc(db, "data_induk", editingId), payload);
        alert("Data jemaat berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "data_induk"), {
          ...payload,
          status: "Aktif",
          status_keanggotaan: "Aktif",
        });
        alert("Data jemaat berhasil ditambahkan.");
      }

      closeFormModal();
      await fetchData();
    } catch (error) {
      console.error("Gagal menyimpan data jemaat:", error);
      alert("Gagal menyimpan data jemaat.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    const confirmed = window.confirm("Hapus data jemaat ini?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "data_induk", itemId));
      await fetchData();
    } catch (error) {
      console.error("Gagal menghapus data jemaat:", error);
      alert("Gagal menghapus data jemaat.");
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    if (!status) return "bg-slate-100 text-slate-700";
    const normalized = status.toLowerCase();
    if (normalized === "aktif") return "bg-green-100 text-green-800";
    if (normalized === "meninggal") return "bg-rose-100 text-rose-800";
    return "bg-amber-100 text-amber-800";
  };

  const sortJemaat = (items: Jemaat[]) => [...items].sort((first, second) => (first.nama ?? "").localeCompare(second.nama ?? ""));

  const filteredJemaat = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const matched = keyword
      ? sortJemaat(jemaat).filter((item) => {
          const haystack = `${item.nama ?? ""} ${item.nik ?? ""} ${item.nkk ?? ""}`.toLowerCase();
          return haystack.includes(keyword);
        })
      : sortJemaat(jemaat);

    return matched;
  }, [jemaat, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredJemaat.length / 10));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleJemaat = useMemo(() => filteredJemaat.slice((currentPage - 1) * 10, currentPage * 10), [filteredJemaat, currentPage]);

  if (loading) return <p className="text-sm text-slate-600">Memuat data jemaat...</p>;

  return (
    <div className="min-w-0 space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-200/30 ring-1 ring-slate-200/60">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,28rem)] lg:items-end">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Data Induk Warga Jemaat</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">GKJW Jemaat Kucur</h1>
            <p className="text-sm leading-6 text-slate-600">Kelola data jemaat dengan cepat dan rapi.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="relative w-full min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-12 py-3 text-sm text-slate-900 shadow-sm transition duration-150 focus:border-emerald-300 focus:bg-white focus:outline-none"
                placeholder="Cari nama, NIK, atau NKK"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-800"
              onClick={openAddForm}
            >
              <Plus className="h-4 w-4" />
              Tambah data jemaat baru
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-visible rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-sm">
        <div className="hidden items-center grid-cols-[4rem_2fr_3fr_1.5fr_1fr_auto] gap-4 border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 sm:grid">
          <span />
          <span>Nama</span>
          <span>Alamat</span>
          <span>Kategori Usia</span>
          <span>Status</span>
          <span className="text-right">Aksi</span>
        </div>

        <div className="divide-y divide-slate-200 p-3">
          {visibleJemaat.length > 0 ? (
            visibleJemaat.map((item) => (
              <article
                key={item.id}
                className="group relative overflow-visible rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:grid sm:grid-cols-[4rem_2fr_3fr_1.5fr_1fr_auto] sm:items-center sm:gap-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-emerald-950 text-white shadow-sm shadow-emerald-950/10">
                  <span className="text-base font-semibold">{item.nama ? item.nama.charAt(0).toUpperCase() : "?"}</span>
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{item.nama ?? "-"}</p>
                </div>

                <div className="mt-3 sm:mt-0">
                  <p className="text-sm font-semibold text-slate-900">{item.alamat ?? "-"}</p>
                </div>

                <div className="mt-3 sm:mt-0">
                  <p className="text-sm text-slate-700">{item.kategoriUsia ?? "-"}</p>
                </div>

                <div className="mt-3 sm:mt-0">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                    {item.status ?? "Tidak Diketahui"}
                  </span>
                </div>

                <div className="mt-4 flex justify-end gap-3 sm:mt-0">
                  <button
                    type="button"
                    className="text-slate-500 transition hover:text-slate-900"
                    onClick={() => openDetailModal(item)}
                    aria-label={`Detail ${item.nama ?? "jemaat"}`}
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 transition hover:text-sky-600"
                    onClick={() => {
                      setQrItem(item);
                      setShowQRModal(true);
                    }}
                    aria-label={`Lihat QR ${item.nama ?? "jemaat"}`}
                  >
                    {/* QR icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                      <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                      <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 transition hover:text-blue-600"
                    onClick={() => openEditForm(item)}
                    aria-label={`Edit ${item.nama ?? "jemaat"}`}
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="text-slate-500 transition hover:text-red-600"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Hapus ${item.nama ?? "jemaat"}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              Tidak ada data jemaat yang sesuai pencarian.
            </div>
          )}
        </div>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
        >
          Kembali
        </button>
        <span className="text-sm text-slate-500">Halaman {currentPage} dari {totalPages}</span>
        <button
          type="button"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
        >
          Lanjut
        </button>
      </div>

      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onClick={closeFormModal}>
          <div className="mx-auto flex w-full max-w-3xl max-h-[calc(100vh-4rem)] flex-col overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{editingId ? "Edit data jemaat" : "Tambah data jemaat baru"}</h2>
                <p className="mt-2 text-sm text-slate-500">Isi form berikut untuk menyimpan data jemaat.</p>
              </div>
              <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300" onClick={closeFormModal}>
                Tutup
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">NIK</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="NIK" value={form.nik} onChange={(event) => setForm({ ...form, nik: event.target.value })} />
                  {nikError ? (
                    <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700 ring-1 ring-amber-200">
                      <strong className="block font-semibold">NIK sudah terdaftar</strong>
                      <span>{nikError}</span>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">NKK / No KK</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="NKK / No KK" value={form.nkk} onChange={(event) => setForm({ ...form, nkk: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Nama</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Nama" value={form.nama} onChange={(event) => setForm({ ...form, nama: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tanggal Lahir</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" type="date" value={form.tanggalLahir} onChange={(event) => setForm({ ...form, tanggalLahir: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tanggal Baptis</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" type="date" value={form.tanggalBaptis} onChange={(event) => setForm({ ...form, tanggalBaptis: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Jenis Kelamin</label>
                  <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" value={form.jenisKelamin} onChange={(event) => setForm({ ...form, jenisKelamin: event.target.value })}>
                    <option value="">Jenis Kelamin</option>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Status Perkawinan</label>
                  <select className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" value={form.statusPerkawinan} onChange={(event) => setForm({ ...form, statusPerkawinan: event.target.value })}>
                    <option value="">Status Perkawinan</option>
                    <option value="Menikah">Menikah</option>
                    <option value="Duda">Duda</option>
                    <option value="Janda">Janda</option>
                    <option value="Belum Menikah">Belum Menikah</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Alamat</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Alamat" value={form.alamat} onChange={(event) => setForm({ ...form, alamat: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">RT/RT</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="RT/RT" value={form.rtRt} onChange={(event) => setForm({ ...form, rtRt: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Desa/Kelurahan</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Desa/Kelurahan" value={form.desaKelurahan} onChange={(event) => setForm({ ...form, desaKelurahan: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Kecamatan</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Kecamatan" value={form.kecamatan} onChange={(event) => setForm({ ...form, kecamatan: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Nomor HP</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Nomor HP" value={form.nomorHp} onChange={(event) => setForm({ ...form, nomorHp: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Email</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Umur</label>
                  <input
                    type="number"
                    readOnly
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 shadow-sm"
                    value={form.umur}
                    placeholder="Umur otomatis"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Kategori Usia</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500 shadow-sm"
                    value={form.kategoriUsia}
                    placeholder="Kategori otomatis"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Pin Point</label>
                  <input className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-slate-300 focus:bg-white" placeholder="Pin Point (contoh: -6.2000,106.8166)" value={form.pinPoint} onChange={(event) => setForm({ ...form, pinPoint: event.target.value })} />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={saving} className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-950/20 transition hover:bg-slate-800">
                  {saving ? "Menyimpan..." : editingId ? "Perbarui Data" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showQRModal && qrItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setShowQRModal(false)}>
          <div className="mx-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">QR Card</h3>
                <p className="text-sm text-slate-500">Simpan atau cetak QR untuk kartu jemaat.</p>
              </div>
              <button className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm" onClick={() => setShowQRModal(false)}>Tutup</button>
            </div>

            <div className="mt-4 flex flex-col items-center gap-3">
              <div id={`qr-card-${qrItem.id}`} className="rounded-xl bg-white p-4">
                <QRCodeCanvas id={`qrcanvas-${qrItem.id}`} value={qrItem.id} size={220} includeMargin={true} />
                <div className="mt-3 text-center">
                  <div className="text-sm font-semibold text-slate-900">{qrItem.nama}</div>
                  <div className="text-xs text-slate-500">NIK: {qrItem.nik ?? "-"}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    const canvas = document.getElementById(`qrcanvas-${qrItem.id}`) as HTMLCanvasElement | null;
                    if (!canvas) return alert("QR canvas tidak ditemukan.");
                    const url = canvas.toDataURL("image/png");
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `QR_${(qrItem.nama ?? qrItem.id).replace(/\s+/g, "_")}.png`;
                    a.click();
                  }}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold"
                  onClick={() => window.print()}
                >
                  Cetak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
          <div className="mx-auto flex w-full max-w-3xl max-h-[calc(100vh-4rem)] flex-col overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">Detail Jemaat</h2>
                <p className="mt-2 text-sm text-slate-500">Preview lengkap data jemaat yang dipilih.</p>
              </div>
              <button type="button" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300" onClick={() => setShowDetailModal(false)}>
                Tutup
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Nama", detailItem.nama],
                ["NIK", detailItem.nik],
                ["NKK / No KK", detailItem.nkk],
                ["Tanggal Lahir", detailItem.tanggalLahir],
                ["Umur", detailItem.umur?.toString()],
                ["Kategori Usia", detailItem.kategoriUsia],
                ["Tanggal Baptis", detailItem.tanggalBaptis],
                ["Jenis Kelamin", detailItem.jenisKelamin],
                ["Status Perkawinan", detailItem.statusPerkawinan],
                ["Alamat", detailItem.alamat],
                ["RT/RT", detailItem.rtRt],
                ["Desa/Kelurahan", detailItem.desaKelurahan],
                ["Kecamatan", detailItem.kecamatan],
                ["Nomor HP", detailItem.nomorHp],
                ["Email", detailItem.email],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{value ?? "-"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
