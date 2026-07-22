"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign, HandCoins, HeartHandshake, Wallet } from "lucide-react";

const cards = [
  {
    title: "Persembahan Ibadah",
    description: "Catat persembahan dari Minggu, Blok, dan Komisi secara terorganisir.",
    href: "/admin/penerimaan-kas/persembahan-ibadah",
    icon: HandCoins,
  },
  {
    title: "Persembahan Persepuluhan & Syukur",
    description: "Kelola penerimaan persepuluhan dan sumbangan syukur dengan pencatatan yang jelas.",
    href: "/admin/penerimaan-kas/persembahan-persepuluhan-syukur",
    icon: Wallet,
  },
  {
    title: "Sumbangan / Donatur Khusus",
    description: "Pantau sumbangan khusus dan donatur yang memberikan dukungan istimewa.",
    href: "/admin/penerimaan-kas/sumbangan-donatur-khusus",
    icon: HeartHandshake,
  },
];

export default function PenerimaanKasIndexPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Penerimaan Kas</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Kelola semua kategori pemasukan gereja</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Akses cepat untuk mencatat dan memantau persembahan ibadah, persepuluhan, syukur, serta donatur khusus.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/penerimaan-kas/persembahan-ibadah"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              <CircleDollarSign className="h-4 w-4" />
              Lihat Penerimaan Kas
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
