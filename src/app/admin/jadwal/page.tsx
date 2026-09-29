"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminUi as styles } from "../ui";

const IBADAH_TYPES = [
  "Ibadah Minggu",
  "Ibadah Pemuda",
  "Ibadah Remaja",
  "Ibadah Anak",
  "Ibadah Keluarga",
] as const;

type JadwalIbadahRecord = {
  id: string;
  tanggal: Date;
  waktu: string;
  jenis: string;
  tema: string;
  bacaan: string;
  pelayanFirman: string;
  liturgos: string;
  majelis: string;
  pemusik: string;
  multimedia: string;
  isPublic?: boolean;
};

type AbsensiRecord = {
  id: string;
  id_jadwal: string;
  id_jemaat: string;
  nama_jemaat?: string;
  waktu_hadir?: unknown;
};

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTimeLabel(time: string) {
  return time ? time.replace(/^(\d{2}:\d{2})$/, "$1 WIB") : "-";
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate >= today ? "Akan Datang" : "Selesai";
}

function parseFirestoreDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function JadwalPage() {
  const [jenis, setJenis] = useState("Ibadah Minggu");
  const [tema, setTema] = useState("");
  const [bacaan, setBacaan] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [pelayanFirman, setPelayanFirman] = useState("");
  const [liturgos, setLiturgos] = useState("");
  const [majelis, setMajelis] = useState("");
  const [pemusik, setPemusik] = useState("");
  const [multimedia, setMultimedia] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewJadwalId, setViewJadwalId] = useState<string | null>(null);
  const [attendanceModalJadwalId, setAttendanceModalJadwalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [currentPage, setCurrentPage] = useState(0);
  const [jadwalList, setJadwalList] = useState<JadwalIbadahRecord[]>([]);
  const [attendanceByJadwal, setAttendanceByJadwal] = useState<Record<string, AbsensiRecord[]>>({});

  useEffect(() => {
    const jadwalQuery = query(collection(db, "jadwal_ibadah"), orderBy("tanggal", "desc"));
    const unsubscribe = onSnapshot(jadwalQuery, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          const tanggalValue = parseFirestoreDate(data.tanggal);
          if (!tanggalValue) return null;
          return {
            id: doc.id,
            tanggal: tanggalValue,
            waktu: data.waktu || "",
            jenis: data.jenis || "",
            tema: data.tema || "",
            bacaan: data.bacaan || "",
            pelayanFirman: data.pelayanFirman || "",
            liturgos: data.liturgos || "",
            majelis: data.majelis || "",
            pemusik: data.pemusik || "",
            multimedia: data.multimedia || "",
            isPublic: data.isPublic ?? false,
          } as JadwalIbadahRecord;
        })
        .filter((item): item is JadwalIbadahRecord => Boolean(item));

      setJadwalList(items);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const attendanceQuery = query(collection(db, "absensi_ibadah"), orderBy("waktu_hadir", "desc"));
    const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
      const items = snapshot.docs
        .map((doc) => {
          const data = doc.data() as DocumentData;
          if (typeof data.id_jadwal !== "string") return null;
          return {
            id: doc.id,
            id_jadwal: data.id_jadwal,
            id_jemaat: data.id_jemaat || "",
            nama_jemaat: typeof data.nama_jemaat === "string" ? data.nama_jemaat : undefined,
            waktu_hadir: data.waktu_hadir,
          } as AbsensiRecord;
        })
        .filter((item): item is AbsensiRecord => Boolean(item));

      const grouped = items.reduce((acc, item) => {
        if (!acc[item.id_jadwal]) acc[item.id_jadwal] = [];
        acc[item.id_jadwal].push(item);
        return acc;
      }, {} as Record<string, AbsensiRecord[]>);

      setAttendanceByJadwal(grouped);
    });

    return () => unsubscribe();
  }, []);

  const orderedJadwal = useMemo(
    () => [...jadwalList].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()),
    [jadwalList],
  );

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(orderedJadwal.length / pageSize));
  const displayedJadwal = orderedJadwal.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const selectedAttendanceSchedule = useMemo(
    () => (viewJadwalId ? jadwalList.find((item) => item.id === viewJadwalId) ?? null : null),
    [jadwalList, viewJadwalId],
  );

  const attendanceSchedule = useMemo(
    () => (attendanceModalJadwalId ? jadwalList.find((item) => item.id === attendanceModalJadwalId) ?? null : null),
    [jadwalList, attendanceModalJadwalId],
  );

  const selectedAttendanceRecords = viewJadwalId ? attendanceByJadwal[viewJadwalId] ?? [] : [];
  const displayedAttendanceRecords = attendanceSchedule ? (attendanceByJadwal[attendanceSchedule.id] ?? []).slice(0, 5) : [];

  const clearForm = () => {
    setJenis("Ibadah Minggu");
    setTema("");
    setBacaan("");
    setTanggal("");
    setWaktu("");
    setPelayanFirman("");
    setLiturgos("");
    setMajelis("");
    setPemusik("");
    setMultimedia("");
    setIsPublic(false);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastType(type);
    setToastMessage(message);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  useEffect(() => {
    if (currentPage >= pageCount) {
      setCurrentPage(pageCount - 1);
    }
  }, [pageCount, currentPage]);

  const handleSimpan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!tanggal || !waktu.trim() || !jenis.trim() || !tema.trim() || !bacaan.trim()) {
      showToast("Mohon isi semua field Informasi Ibadah sebelum menyimpan.", "error");
      return;
    }

    const tanggalDate = new Date(`${tanggal}T00:00:00`);
    if (Number.isNaN(tanggalDate.getTime())) {
      showToast("Format tanggal tidak valid.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "jadwal_ibadah"), {
        tanggal: tanggalDate,
        waktu: waktu.trim(),
        jenis: jenis.trim(),
        tema: tema.trim(),
        bacaan: bacaan.trim(),
        pelayanFirman: pelayanFirman.trim(),
        liturgos: liturgos.trim(),
        majelis: majelis.trim(),
        pemusik: pemusik.trim(),
        multimedia: multimedia.trim(),
        isPublic,
      });
      clearForm();
      setIsAddModalOpen(false);
      showToast("Jadwal berhasil disimpan.", "success");
    } catch (error) {
      console.error("Gagal menyimpan jadwal:", error);
      showToast("Terjadi kesalahan saat menyimpan jadwal.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, "jadwal_ibadah", confirmDeleteId));
      showToast("Jadwal berhasil dihapus.", "success");
    } catch (error) {
      console.error("Gagal menghapus jadwal:", error);
      showToast("Gagal menghapus jadwal.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className={styles.pageStack}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Daftar Ibadah</h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600">
            Kelola jadwal ibadah Anda dengan cepat. Tambahkan jadwal baru lewat modal dan lihat detail atau hapus dari daftar.
          </p>
        </div>
        <button type="button" onClick={() => setIsAddModalOpen(true)} className={styles.primaryButton}>
          Tambah Jadwal
        </button>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Daftar Ibadah</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Jadwal Ibadah</h2>
          </div>
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            {jadwalList.length} jadwal
          </span>
        </div>

        <div className={styles.tablePanel}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jenis Ibadah</th>
                <th>Tanggal</th>
                <th>Waktu</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="h-10 bg-slate-100" colSpan={4} />
                  </tr>
                ))
              ) : displayedJadwal.length > 0 ? (
                displayedJadwal.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="text-sm font-semibold text-slate-900">{item.jenis}</div>
                      <div className="text-sm text-slate-500">{item.tema || "-"}</div>
                    </td>
                    <td>{formatDateLabel(item.tanggal)}</td>
                    <td>{formatTimeLabel(item.waktu)}</td>
                    <td className="text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setViewJadwalId(item.id)}
                        aria-label="Lihat detail jadwal"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                      >
                        <span className="text-lg">👁️</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceModalJadwalId(item.id)}
                        aria-label="Lihat daftar kehadiran"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                      >
                        <span className="text-lg">📋</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDelete(item.id)}
                        aria-label="Hapus jadwal"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                      >
                        <span className="text-lg">🗑️</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                    Belum ada jadwal ibadah tersimpan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Menampilkan {Math.min(displayedJadwal.length, orderedJadwal.length)} dari {orderedJadwal.length} jadwal.
          </p>
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="text-sm text-slate-600">Halaman {currentPage + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pageCount - 1))}
              disabled={currentPage >= pageCount - 1}
              className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lanjut
            </button>
          </div>
        </div>
      </div>

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Tambah Jadwal Ibadah</h3>
                <p className="mt-1 text-sm text-slate-600">Isi detail jadwal baru dan simpan untuk ditampilkan di daftar.</p>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className={styles.logoutButton}>
                Tutup
              </button>
            </div>
            <form onSubmit={handleSimpan} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Tanggal</span>
                  <input type="date" value={tanggal} onChange={(event) => setTanggal(event.target.value)} className={styles.input} />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Waktu</span>
                  <input type="time" value={waktu} onChange={(event) => setWaktu(event.target.value)} className={styles.input} />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Jenis Ibadah</span>
                <select value={jenis} onChange={(event) => setJenis(event.target.value)} className={styles.select}>
                  {IBADAH_TYPES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Tema</span>
                  <input type="text" value={tema} onChange={(event) => setTema(event.target.value)} placeholder="Masukkan tema" className={styles.input} />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Bacaan Firman</span>
                  <input type="text" value={bacaan} onChange={(event) => setBacaan(event.target.value)} placeholder="Contoh: Yohanes 3:16" className={styles.input} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Pelayan Firman</span>
                  <input type="text" value={pelayanFirman} onChange={(event) => setPelayanFirman(event.target.value)} placeholder="Nama pelayan" className={styles.input} />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Liturgos</span>
                  <input type="text" value={liturgos} onChange={(event) => setLiturgos(event.target.value)} placeholder="Nama liturgos" className={styles.input} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Pemusik & Kantoria</span>
                  <input type="text" value={pemusik} onChange={(event) => setPemusik(event.target.value)} placeholder="Nama pemusik" className={styles.input} />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-medium">Multimedia</span>
                  <input type="text" value={multimedia} onChange={(event) => setMultimedia(event.target.value)} placeholder="Nama operator" className={styles.input} />
                </label>
              </div>

              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Majelis</span>
                <textarea value={majelis} onChange={(event) => setMajelis(event.target.value)} placeholder="Nama majelis atau susunan" className={`${styles.textarea} min-h-[120px]`} />
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="font-medium">Tampilkan ke publik</span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className={styles.logoutButton}>
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className={styles.primaryButton}>
                  {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {viewJadwalId && selectedAttendanceSchedule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Detail Ibadah</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{selectedAttendanceSchedule.jenis}</h3>
              </div>
              <button type="button" onClick={() => setViewJadwalId(null)} className={styles.logoutButton}>
                Tutup
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Tanggal</p>
                <p className="mt-2 text-sm text-slate-900">{formatDateLabel(selectedAttendanceSchedule.tanggal)}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Waktu</p>
                <p className="mt-2 text-sm text-slate-900">{formatTimeLabel(selectedAttendanceSchedule.waktu)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Tema</p>
              <p className="mt-2 text-sm text-slate-900">{selectedAttendanceSchedule.tema || "-"}</p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bacaan Firman</p>
                <p className="mt-2 text-sm text-slate-900">{selectedAttendanceSchedule.bacaan || "-"}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pelayan Firman</p>
                <p className="mt-2 text-sm text-slate-900">{selectedAttendanceSchedule.pelayanFirman || "-"}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Liturgos</p>
                <p className="mt-2 text-sm text-slate-900">{selectedAttendanceSchedule.liturgos || "-"}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pemusik</p>
                <p className="mt-2 text-sm text-slate-900">{selectedAttendanceSchedule.pemusik || "-"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Majelis</p>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-900">{selectedAttendanceSchedule.majelis || "-"}</p>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kehadiran</p>
              <p className="mt-2 text-sm text-slate-900">{selectedAttendanceRecords.length} jemaat terdata hadir</p>
            </div>
          </div>
        </div>
      ) : null}

      {attendanceSchedule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Daftar Kehadiran</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">{attendanceSchedule.jenis}</h3>
                <p className="mt-1 text-sm text-slate-600">Menampilkan maksimal 5 peserta dari {attendanceByJadwal[attendanceSchedule.id]?.length ?? 0} total.</p>
              </div>
              <button type="button" onClick={() => setAttendanceModalJadwalId(null)} className={styles.logoutButton}>
                Tutup
              </button>
            </div>

            {displayedAttendanceRecords.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Belum ada data kehadiran untuk jadwal ini.
              </div>
            ) : (
              <div className="space-y-3">
                {displayedAttendanceRecords.map((record) => (
                  <div key={record.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-slate-900">{record.nama_jemaat || record.id_jemaat || "Jemaat tidak diketahui"}</p>
                      <span className="text-sm text-slate-500">{record.waktu_hadir ? formatDateTime(new Date((record.waktu_hadir as any).seconds * 1000)) : "Waktu tidak tersedia"}</span>
                    </div>
                    {record.id_jemaat && <p className="mt-2 text-sm text-slate-600">ID Jemaat: {record.id_jemaat}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Konfirmasi Hapus</p>
            <h3 className="mt-4 text-xl font-semibold text-slate-950">Hapus jadwal?</h3>
            <p className="mt-2 text-sm text-slate-600">Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus jadwal ini?</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirmDeleteId(null)} className={styles.logoutButton}>
                Batal
              </button>
              <button type="button" onClick={confirmDelete} className="inline-flex h-11 items-center justify-center rounded-2xl bg-rose-600 px-5 text-sm font-semibold text-white transition hover:bg-rose-700">
                Hapus
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-sm rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-2xl">
            <p className={`text-sm font-semibold ${toastType === "success" ? "text-emerald-700" : "text-rose-700"}`}>{toastMessage}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
