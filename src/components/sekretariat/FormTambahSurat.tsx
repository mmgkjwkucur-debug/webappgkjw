"use client";

import { useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

const wilayahOptions = ["Induk", "Pepanthan A", "Pepanthan B", "Pepanthan C"];
const jenisSuratOptions = [
  "Surat Pengantar Nikah",
  "Surat Keterangan Anggota Jemaat (Pindah/Masuk)",
  "Surat Baptis/Sidi",
];

type FormState = {
  nama: string;
  asalWilayah: string;
  jenisSurat: string;
  keperluan: string;
  tanggalPengajuan: string;
};

export function FormTambahSurat({
  onSaved,
  onCancel,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    nama: "",
    asalWilayah: wilayahOptions[0],
    jenisSurat: jenisSuratOptions[0],
    keperluan: "",
    tanggalPengajuan: new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isSubmitDisabled = useMemo(
    () => !form.nama.trim() || !form.keperluan.trim(),
    [form.nama, form.keperluan],
  );

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.nama.trim()) nextErrors.nama = "Nama Jemaat wajib diisi.";
    if (!form.keperluan.trim()) nextErrors.keperluan = "Keperluan / Perihal wajib diisi.";

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        createdAt: new Date().toISOString(),
      };

      // TODO: Tambahkan logika Firebase Firestore addDoc di sini.
      // await addDoc(collection(db, "permohonanSurat"), payload);

      onSaved?.();
      onCancel?.();
    } catch (error) {
      console.error("Gagal menyimpan permohonan surat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
            Formulir Permohonan Surat Baru
          </p>
          <p className="mt-1 text-sm text-slate-500">Isi data permohonan surat untuk administrasi sekretariat.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
          aria-label="Tutup formulir"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nama Jemaat</span>
            <input
              type="text"
              value={form.nama}
              onChange={(event) => handleChange("nama", event.target.value)}
              className={`w-full rounded-3xl border px-4 py-3 text-sm transition focus:outline-none ${
                errors.nama
                  ? "border-red-400 bg-red-50 text-slate-900"
                  : "border-slate-200 bg-slate-50 focus:border-emerald-300"
              }`}
              placeholder="Nama lengkap jemaat"
            />
            {errors.nama ? <p className="text-xs text-red-600">{errors.nama}</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Asal Wilayah</span>
            <select
              value={form.asalWilayah}
              onChange={(event) => handleChange("asalWilayah", event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-300 focus:outline-none"
            >
              {wilayahOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Jenis Surat</span>
            <select
              value={form.jenisSurat}
              onChange={(event) => handleChange("jenisSurat", event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-300 focus:outline-none"
            >
              {jenisSuratOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Tanggal Pengajuan</span>
            <input
              type="date"
              value={form.tanggalPengajuan}
              onChange={(event) => handleChange("tanggalPengajuan", event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-300 focus:outline-none"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Keperluan / Perihal</span>
          <textarea
            value={form.keperluan}
            onChange={(event) => handleChange("keperluan", event.target.value)}
            rows={5}
            className={`w-full rounded-3xl border px-4 py-3 text-sm transition focus:outline-none ${
              errors.keperluan
                ? "border-red-400 bg-red-50 text-slate-900"
                : "border-slate-200 bg-slate-50 focus:border-emerald-300"
            }`}
            placeholder="Jelaskan ringkas keperluan surat"
          />
          {errors.keperluan ? <p className="text-xs text-red-600">{errors.keperluan}</p> : null}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || isSubmitDisabled}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Simpan Permohonan
          </button>
        </div>
      </form>
    </div>
  );
}
