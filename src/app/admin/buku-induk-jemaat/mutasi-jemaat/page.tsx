"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { Eye, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { adminUi as styles } from "../../ui";

type MutationType = "atestasi_masuk" | "atestasi_keluar" | "meninggal";
type TabKey = MutationType;

type JemaatRecord = {
  id: string;
  nama_lengkap?: string;
  nama?: string;
  status?: string;
  status_keanggotaan?: string;
  gereja_asal?: string;
  gereja_tujuan?: string;
  tanggal_atestasi?: string;
  tanggal_meninggal?: string;
  nomor_surat_atestasi?: string;
  tempat_dimakamkan?: string;
  keterangan?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MutationRecord = {
  id: string;
  jenis_mutasi: MutationType;
  nama_lengkap?: string;
  jemaat_id?: string;
  jemaat_nama?: string;
  gereja_asal?: string;
  gereja_tujuan?: string;
  tanggal_atestasi?: string;
  tanggal_meninggal?: string;
  nomor_surat_atestasi?: string;
  tempat_dimakamkan?: string;
  keterangan?: string;
  createdAt?: string;
};

type ToastState = {
  type: "success" | "error" | "info";
  message: string;
};

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "atestasi_masuk", label: "Atestasi Masuk" },
  { key: "atestasi_keluar", label: "Atestasi Keluar" },
  { key: "meninggal", label: "Meninggal" },
];

const tabDescriptions: Record<TabKey, string> = {
  atestasi_masuk: "Riwayat jemaat baru yang masuk melalui atestasi gereja asal.",
  atestasi_keluar: "Riwayat jemaat yang pindah gereja atau keluar dari keanggotaan.",
  meninggal: "Catatan jemaat yang telah meninggal dan proses administrasinya.",
};

function getTypeLabel(type: MutationType) {
  return {
    atestasi_masuk: "Atestasi Masuk",
    atestasi_keluar: "Atestasi Keluar",
    meninggal: "Meninggal",
  }[type];
}

function getTypeBadgeClass(type: MutationType) {
  return {
    atestasi_masuk: "border-emerald-200 bg-emerald-50 text-emerald-700",
    atestasi_keluar: "border-amber-200 bg-amber-50 text-amber-700",
    meninggal: "border-rose-200 bg-rose-50 text-rose-700",
  }[type];
}

const emptyForm = {
  jenisMutasi: "atestasi_masuk" as MutationType,
  namaLengkap: "",
  gerejaAsal: "",
  gerejaTujuan: "",
  tanggalAtestasi: "",
  tanggalMeninggal: "",
  nomorSuratAtestasi: "",
  tempatDimakamkan: "",
  keterangan: "",
  jemaatId: "",
};

export default function MutasiJemaatPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("atestasi_masuk");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MutationRecord | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [members, setMembers] = useState<JemaatRecord[]>([]);
  const [mutations, setMutations] = useState<MutationRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [memberSearch, setMemberSearch] = useState("");

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      const status = (member.status ?? member.status_keanggotaan ?? "Aktif").toLowerCase();
      const label = (member.nama_lengkap ?? member.nama ?? "").toLowerCase();
      const matchStatus = status === "aktif" || status === "active" || status === "";
      const matchSearch = !term || label.includes(term);
      return matchStatus && matchSearch;
    });
  }, [members, memberSearch]);

  const activeMutations = useMemo(
    () => mutations.filter((item) => item.jenis_mutasi === activeTab),
    [mutations, activeTab],
  );

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dataIndukQuery = query(collection(db, "data_induk"), orderBy("nama", "asc"));
      const mutasiQuery = query(collection(db, "mutasi"), orderBy("createdAt", "desc"));

      const [dataIndukSnapshot, mutasiSnapshot] = await Promise.all([
        getDocs(dataIndukQuery),
        getDocs(mutasiQuery),
      ]);

      const localMembers = dataIndukSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        return {
          id: docSnap.id,
          ...data,
          nama_lengkap: typeof data.nama_lengkap === "string" ? data.nama_lengkap : typeof data.nama === "string" ? data.nama : "-",
          status: typeof data.status === "string" ? data.status : typeof data.status_keanggotaan === "string" ? data.status_keanggotaan : "Aktif",
        };
      }) as JemaatRecord[];

      const localMutations = mutasiSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Record<string, unknown>),
      })) as MutationRecord[];

      setMembers(localMembers);
      setMutations(localMutations);
    } catch (error) {
      console.error("Gagal memuat data mutasi jemaat:", error);
      setToast({ type: "error", message: "Gagal mengambil data dari Firestore." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openModal = () => {
    setForm(emptyForm);
    setMemberSearch("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm(emptyForm);
    setMemberSearch("");
  };

  const handleChooseMember = (memberId: string, label: string) => {
    setForm((current) => ({ ...current, jemaatId: memberId }));
    setMemberSearch(label);
  };

  const getMemberName = (memberId: string) => {
    const member = members.find((item) => item.id === memberId);
    return member?.nama_lengkap ?? member?.nama ?? "-";
  };

  const syncJemaatStatus = async (memberId: string, status: string) => {
    const dataIndukRef = doc(db, "data_induk", memberId);
    const dataIndukSnapshot = await getDoc(dataIndukRef);
    const now = new Date().toISOString();

    if (dataIndukSnapshot.exists()) {
      await updateDoc(dataIndukRef, {
        status,
        updatedAt: now,
      });
      return true;
    }

    await setDoc(dataIndukRef, {
      nama: getMemberName(memberId),
      status,
      createdAt: now,
      updatedAt: now,
    });
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting) return;

    const basePayload = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);

      if (form.jenisMutasi === "atestasi_masuk") {
        if (!form.namaLengkap.trim() || !form.gerejaAsal.trim() || !form.tanggalAtestasi || !form.nomorSuratAtestasi.trim()) {
          setToast({ type: "error", message: "Lengkapi semua field wajib untuk Atestasi Masuk." });
          setIsSubmitting(false);
          return;
        }

        const jemaatRef = await addDoc(collection(db, "data_induk"), {
          ...basePayload,
          nama_lengkap: form.namaLengkap.trim(),
          nama: form.namaLengkap.trim(),
          status: "Aktif",
          status_keanggotaan: "Aktif",
          gereja_asal: form.gerejaAsal.trim(),
          tanggal_atestasi: form.tanggalAtestasi,
          nomor_surat_atestasi: form.nomorSuratAtestasi.trim(),
          keterangan: form.keterangan.trim(),
        });

        await addDoc(collection(db, "mutasi"), {
          ...basePayload,
          jenis_mutasi: "atestasi_masuk",
          jemaat_id: jemaatRef.id,
          jemaat_nama: form.namaLengkap.trim(),
          gereja_asal: form.gerejaAsal.trim(),
          tanggal_atestasi: form.tanggalAtestasi,
          nomor_surat_atestasi: form.nomorSuratAtestasi.trim(),
          keterangan: form.keterangan.trim(),
        });
      }

      if (form.jenisMutasi === "atestasi_keluar") {
        if (!form.jemaatId || !form.gerejaTujuan.trim() || !form.tanggalAtestasi) {
          setToast({ type: "error", message: "Pilih jemaat, gereja tujuan, dan tanggal atestasi." });
          setIsSubmitting(false);
          return;
        }

        const currentMemberName = getMemberName(form.jemaatId);
        await syncJemaatStatus(form.jemaatId, "Pindah");

        await updateDoc(doc(db, "jemaat", form.jemaatId), {
          status: "Pindah",
          status_keanggotaan: "Atestasi Keluar",
          gereja_tujuan: form.gerejaTujuan.trim(),
          tanggal_atestasi: form.tanggalAtestasi,
          keterangan: form.keterangan.trim(),
          updatedAt: new Date().toISOString(),
        });

        await addDoc(collection(db, "mutasi"), {
          ...basePayload,
          jenis_mutasi: "atestasi_keluar",
          jemaat_id: form.jemaatId,
          jemaat_nama: currentMemberName,
          gereja_tujuan: form.gerejaTujuan.trim(),
          tanggal_atestasi: form.tanggalAtestasi,
          keterangan: form.keterangan.trim(),
        });
      }

      if (form.jenisMutasi === "meninggal") {
        if (!form.jemaatId || !form.tanggalMeninggal || !form.tempatDimakamkan.trim()) {
          setToast({ type: "error", message: "Pilih jemaat, tanggal meninggal, dan tempat dimakamkan." });
          setIsSubmitting(false);
          return;
        }

        const currentMemberName = getMemberName(form.jemaatId);
        await syncJemaatStatus(form.jemaatId, "Meninggal");
        await updateDoc(doc(db, "jemaat", form.jemaatId), {
          status: "Meninggal",
          status_keanggotaan: "Meninggal",
          tanggal_meninggal: form.tanggalMeninggal,
          tempat_dimakamkan: form.tempatDimakamkan.trim(),
          keterangan: form.keterangan.trim(),
          updatedAt: new Date().toISOString(),
        });

        await addDoc(collection(db, "mutasi"), {
          ...basePayload,
          jenis_mutasi: "meninggal",
          jemaat_id: form.jemaatId,
          jemaat_nama: currentMemberName,
          tanggal_meninggal: form.tanggalMeninggal,
          tempat_dimakamkan: form.tempatDimakamkan.trim(),
          keterangan: form.keterangan.trim(),
        });
      }

      setToast({ type: "success", message: "Data mutasi berhasil disimpan." });
      closeModal();
      await loadData();
    } catch (error) {
      console.error("Gagal menyimpan data mutasi:", error);
      setToast({ type: "error", message: "Gagal menyimpan data mutasi. Cek kembali koneksi atau aturan Firestore." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    const confirmed = window.confirm("Hapus riwayat mutasi ini?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "mutasi", recordId));
      setToast({ type: "success", message: "Riwayat mutasi berhasil dihapus." });
      await loadData();
    } catch (error) {
      console.error("Gagal menghapus riwayat mutasi:", error);
      setToast({ type: "error", message: "Gagal menghapus riwayat mutasi." });
    }
  };

  const renderTableHead = () => {
    switch (activeTab) {
      case "atestasi_masuk":
        return (
          <>
            <th>Nama Jemaat</th>
            <th>Gereja Asal</th>
            <th>Tanggal Atestasi</th>
            <th>Nomor Surat</th>
            <th>Keterangan</th>
            <th className="text-right">Aksi</th>
          </>
        );
      case "atestasi_keluar":
        return (
          <>
            <th>Nama Jemaat</th>
            <th>Gereja Tujuan</th>
            <th>Tanggal Atestasi</th>
            <th>Keterangan</th>
            <th className="text-right">Aksi</th>
          </>
        );
      case "meninggal":
        return (
          <>
            <th>Nama Jemaat</th>
            <th>Tanggal Wafat</th>
            <th>Tempat Dimakamkan</th>
            <th>Keterangan</th>
            <th className="text-right">Aksi</th>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRow = (record: MutationRecord) => {
    switch (activeTab) {
      case "atestasi_masuk":
        return (
          <>
            <td>{record.jemaat_nama ?? "-"}</td>
            <td>{record.gereja_asal ?? "-"}</td>
            <td>{record.tanggal_atestasi ?? "-"}</td>
            <td>{record.nomor_surat_atestasi ?? "-"}</td>
            <td>{record.keterangan ?? "-"}</td>
          </>
        );
      case "atestasi_keluar":
        return (
          <>
            <td>{record.jemaat_nama ?? "-"}</td>
            <td>{record.gereja_tujuan ?? "-"}</td>
            <td>{record.tanggal_atestasi ?? "-"}</td>
            <td>{record.keterangan ?? "-"}</td>
          </>
        );
      case "meninggal":
        return (
          <>
            <td>{record.jemaat_nama ?? "-"}</td>
            <td>{record.tanggal_meninggal ?? "-"}</td>
            <td>{record.tempat_dimakamkan ?? "-"}</td>
            <td>{record.keterangan ?? "-"}</td>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Mutasi Jemaat</h1>
          <p>Kelola riwayat perubahan status keanggotaan jemaat secara terpusat untuk Atestasi Masuk, Atestasi Keluar, dan Meninggal.</p>
        </div>

        <button type="button" className={styles.primaryButton} onClick={openModal}>
          <Plus className="h-4 w-4" />
          <span>Tambah Data Mutasi</span>
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/70 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-600">{tabDescriptions[activeTab]}</p>
      </section>

      <section className={`${styles.tablePanel} overflow-hidden`}>
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-6 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
                <div className="h-4 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={styles.table}>
              <thead>
                <tr>{renderTableHead()}</tr>
              </thead>
              <tbody>
                {activeMutations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Belum ada data riwayat untuk kategori ini.
                    </td>
                  </tr>
                ) : (
                  activeMutations.map((record) => (
                    <tr key={record.id} className="transition hover:bg-slate-50/80">
                      {renderTableRow(record)}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-transparent p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                            onClick={() => {
                              setSelectedRecord(record);
                              setIsDetailOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-transparent p-2 text-rose-600 transition hover:bg-rose-50"
                            onClick={() => void handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Tambah Data Mutasi</h2>
                <p className="text-sm text-slate-500">Catat riwayat mutasi jemaat dan update status di buku induk.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                onClick={closeModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="space-y-5 p-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Jenis Mutasi</span>
                  <select
                    className={styles.select}
                    value={form.jenisMutasi}
                    onChange={(event) => setForm((current) => ({ ...current, jenisMutasi: event.target.value as MutationType }))}
                  >
                    {tabs.map((tab) => (
                      <option key={tab.key} value={tab.key}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </label>

                {form.jenisMutasi === "atestasi_masuk" ? (
                  <>
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Nama Lengkap Jemaat</span>
                      <input
                        className={styles.input}
                        value={form.namaLengkap}
                        onChange={(event) => setForm((current) => ({ ...current, namaLengkap: event.target.value }))}
                        placeholder="Contoh: Bp. Antoni Wibowo"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Gereja Asal</span>
                      <input
                        className={styles.input}
                        value={form.gerejaAsal}
                        onChange={(event) => setForm((current) => ({ ...current, gerejaAsal: event.target.value }))}
                        placeholder="Gereja asal jemaat"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Tanggal Atestasi</span>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.tanggalAtestasi}
                        onChange={(event) => setForm((current) => ({ ...current, tanggalAtestasi: event.target.value }))}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Nomor Surat Atestasi</span>
                      <input
                        className={styles.input}
                        value={form.nomorSuratAtestasi}
                        onChange={(event) => setForm((current) => ({ ...current, nomorSuratAtestasi: event.target.value }))}
                        placeholder="Nomor surat"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Keterangan</span>
                      <textarea
                        className={styles.textarea}
                        value={form.keterangan}
                        onChange={(event) => setForm((current) => ({ ...current, keterangan: event.target.value }))}
                        placeholder="Catatan tambahan / keterangan mutasi"
                      />
                    </label>
                  </>
                ) : null}

                {form.jenisMutasi === "atestasi_keluar" ? (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Pilih Jemaat</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          className={`${styles.input} pl-9`}
                          placeholder="Ketik nama jemaat untuk mencari..."
                          value={memberSearch}
                          onChange={(event) => {
                            setMemberSearch(event.target.value);
                            if (form.jemaatId) {
                              setForm((current) => ({ ...current, jemaatId: "" }));
                            }
                          }}
                        />
                      </div>

                      {memberSearch.trim().length > 0 ? (
                        <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                          {filteredMembers.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-slate-500">Tidak ada jemaat yang cocok.</div>
                          ) : (
                            filteredMembers.slice(0, 8).map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-slate-50"
                                onClick={() => handleChooseMember(member.id, member.nama_lengkap ?? member.nama ?? "-")}
                              >
                                <span>{member.nama_lengkap ?? member.nama ?? "-"}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  {member.status_keanggotaan ?? "Aktif"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Gereja Tujuan</span>
                      <input
                        className={styles.input}
                        value={form.gerejaTujuan}
                        onChange={(event) => setForm((current) => ({ ...current, gerejaTujuan: event.target.value }))}
                        placeholder="Gereja tujuan"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Tanggal Atestasi</span>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.tanggalAtestasi}
                        onChange={(event) => setForm((current) => ({ ...current, tanggalAtestasi: event.target.value }))}
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Alasan / Keterangan</span>
                      <textarea
                        className={styles.textarea}
                        value={form.keterangan}
                        onChange={(event) => setForm((current) => ({ ...current, keterangan: event.target.value }))}
                        placeholder="Isi alasan atau keterangan atestasi keluar"
                      />
                    </label>
                  </>
                ) : null}

                {form.jenisMutasi === "meninggal" ? (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Pilih Jemaat</span>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <input
                          className={`${styles.input} pl-9`}
                          placeholder="Ketik nama jemaat untuk mencari..."
                          value={memberSearch}
                          onChange={(event) => {
                            setMemberSearch(event.target.value);
                            if (form.jemaatId) {
                              setForm((current) => ({ ...current, jemaatId: "" }));
                            }
                          }}
                        />
                      </div>

                      {memberSearch.trim().length > 0 ? (
                        <div className="max-h-56 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                          {filteredMembers.length === 0 ? (
                            <div className="px-3 py-3 text-sm text-slate-500">Tidak ada jemaat yang cocok.</div>
                          ) : (
                            filteredMembers.slice(0, 8).map((member) => (
                              <button
                                key={member.id}
                                type="button"
                                className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-slate-50"
                                onClick={() => handleChooseMember(member.id, member.nama_lengkap ?? member.nama ?? "-")}
                              >
                                <span>{member.nama_lengkap ?? member.nama ?? "-"}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                  {member.status_keanggotaan ?? "Aktif"}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : null}
                    </div>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Tanggal Meninggal</span>
                      <input
                        type="date"
                        className={styles.input}
                        value={form.tanggalMeninggal}
                        onChange={(event) => setForm((current) => ({ ...current, tanggalMeninggal: event.target.value }))}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-slate-700">Tempat Dimakamkan</span>
                      <input
                        className={styles.input}
                        value={form.tempatDimakamkan}
                        onChange={(event) => setForm((current) => ({ ...current, tempatDimakamkan: event.target.value }))}
                        placeholder="Tempat pemakaman"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className="text-sm font-semibold text-slate-700">Keterangan / Sakit</span>
                      <textarea
                        className={styles.textarea}
                        value={form.keterangan}
                        onChange={(event) => setForm((current) => ({ ...current, keterangan: event.target.value }))}
                        placeholder="Sakit / gejala / catatan tambahan"
                      />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" className={styles.logoutButton} onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Simpan Data</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDetailOpen && selectedRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Detail Mutasi</h2>
                <div className="mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
                  {getTypeLabel(selectedRecord.jenis_mutasi)}
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                onClick={() => setIsDetailOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-5 text-sm text-slate-700">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="font-semibold text-slate-900">Nama Jemaat</span>
                <span>{selectedRecord.jemaat_nama ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="font-semibold text-slate-900">Tanggal</span>
                <span>{selectedRecord.tanggal_atestasi ?? selectedRecord.tanggal_meninggal ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="font-semibold text-slate-900">Gereja Asal / Tujuan</span>
                <span>{selectedRecord.gereja_asal ?? selectedRecord.gereja_tujuan ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <span className="font-semibold text-slate-900">Nomor Surat / Tempat Makan</span>
                <span>{selectedRecord.nomor_surat_atestasi ?? selectedRecord.tempat_dimakamkan ?? "-"}</span>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="mb-1 font-semibold text-slate-900">Keterangan</div>
                <div>{selectedRecord.keterangan ?? "-"}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
          <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${getTypeBadgeClass(activeTab)}`}>
            {toast.type}
          </div>
          <div className="mt-2 text-sm text-slate-700">{toast.message}</div>
        </div>
      ) : null}
    </div>
  );
}
