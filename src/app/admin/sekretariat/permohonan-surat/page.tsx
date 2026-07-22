"use client";

import { useState } from "react";
import { FormTambahSurat } from "@/components/sekretariat/FormTambahSurat";

export default function PermohonanSuratPage() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Permohonan Surat</p>
          <h1 className="text-3xl font-semibold text-slate-950">Formulir Permohonan Surat GKJW</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">Lengkapi data berikut untuk membuat permohonan surat resmi di sekretariat GKJW.</p>
          {message ? <p className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p> : null}
        </div>
      </div>

      <FormTambahSurat onSaved={() => setMessage("Permohonan surat berhasil disimpan.")} onCancel={() => setMessage(null)} />
    </div>
  );
}
