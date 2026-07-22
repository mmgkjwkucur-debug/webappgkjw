"use client";

import Link from "next/link";
import { ArrowRight, ClipboardList, BookOpen, Sparkles, FileText } from "lucide-react";

const cards = [
  {
    title: "Permohonan Surat",
    description: "Buat dan kelola permohonan surat resmi jemaat GKJW.",
    href: "/admin/sekretariat/permohonan-surat",
    icon: ClipboardList,
  },
  {
    title: "Notulensi Rapat",
    description: "Simpan hasil rapat secara rapi dan terstruktur.",
    href: "/admin/sekretariat/notulensi-rapat",
    icon: BookOpen,
  },
  {
    title: "Asisten AI Admin",
    description: "Gunakan AI untuk otomatisasi dokumen dan warta jemaat.",
    href: "/admin/sekretariat/asisten-ai",
    icon: Sparkles,
  },
];

export default function SekretariatIndexPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Sekretariat & Surat</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Pusat administrasi surat dan notulensi</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Akses cepat ke permohonan surat, notulensi rapat, dan asisten AI khusus sekretariat.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/sekretariat/permohonan-surat"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <FileText className="h-4 w-4" />
              Mulai Permohonan Surat
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 transition hover:border-emerald-200 hover:bg-white">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold text-slate-950">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{card.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Buka <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
