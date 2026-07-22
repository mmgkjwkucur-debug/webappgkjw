"use client";

import { FormAsistenAI } from "@/components/sekretariat/FormAsistenAI";

export default function AsistenAIPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Asisten AI Admin</p>
          <h1 className="text-3xl font-semibold text-slate-950">Asisten AI Sekretariat GKJW</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">Otomatisasi format notulensi, tugas aksi, dan pengumuman warta jemaat dengan Gemini.</p>
        </div>
      </div>

      <FormAsistenAI />
    </div>
  );
}
