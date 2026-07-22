"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type FormState = {
  agenda: string;
  tanggalRapat: string;
  pencatat: string;
  isiNotulen: string;
};

export function FormTambahNotulen({
  onSaved,
  onCancel,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormState>({
    agenda: "",
    tanggalRapat: new Date().toISOString().slice(0, 10),
    pencatat: "",
    isiNotulen: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isSubmitDisabled = useMemo(
    () => !form.agenda.trim() || !form.isiNotulen.trim(),
    [form.agenda, form.isiNotulen],
  );

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.agenda.trim()) nextErrors.agenda = "Agenda / Tipe rapat wajib diisi.";
    if (!form.isiNotulen.trim()) nextErrors.isiNotulen = "Isi notulen wajib diisi.";

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
      // await addDoc(collection(db, "notulensiRapat"), payload);

      onSaved?.();
      onCancel?.();
    } catch (error) {
      console.error("Gagal menyimpan notulen rapat:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
          Formulir Input Notulensi Rapat
        </p>
        <p className="mt-1 text-sm text-slate-500">Catat hasil rapat secara terstruktur dan siap diarsipkan.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Agenda / Tipe Rapat</span>
            <input
              type="text"
              value={form.agenda}
              onChange={(event) => handleChange("agenda", event.target.value)}
              className={`w-full rounded-3xl border px-4 py-3 text-sm transition focus:outline-none ${
                errors.agenda
                  ? "border-red-400 bg-red-50 text-slate-900"
                  : "border-slate-200 bg-slate-50 focus:border-emerald-300"
              }`}
              placeholder="Rapat Pleno PHMJ / Sidang Jemaat"
            />
            {errors.agenda ? <p className="text-xs text-red-600">{errors.agenda}</p> : null}
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Tanggal Rapat</span>
            <input
              type="date"
              value={form.tanggalRapat}
              onChange={(event) => handleChange("tanggalRapat", event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-300 focus:outline-none"
            />
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Pencatat / Notulis</span>
            <input
              type="text"
              value={form.pencatat}
              onChange={(event) => handleChange("pencatat", event.target.value)}
              className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition focus:border-emerald-300 focus:outline-none"
              placeholder="Nama pencatat notulen"
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Isi Mentah Hasil Rapat</span>
          <textarea
            value={form.isiNotulen}
            onChange={(event) => handleChange("isiNotulen", event.target.value)}
            rows={9}
            className={`w-full rounded-3xl border px-4 py-3 text-sm transition focus:outline-none ${
              errors.isiNotulen
                ? "border-red-400 bg-red-50 text-slate-900"
                : "border-slate-200 bg-slate-50 focus:border-emerald-300"
            }`}
            placeholder="Ketik atau tempel poin-poin keputusan rapat di sini..."
          />
          {errors.isiNotulen ? <p className="text-xs text-red-600">{errors.isiNotulen}</p> : null}
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
            Simpan Notulen
          </button>
        </div>
      </form>
    </div>
  );
}
