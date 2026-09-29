"use client";

import { useState } from "react";
import Link from "next/link";
import { adminUi as styles } from "../ui";

const tabs = [
  {
    id: "kk",
    label: "Kartu Keluarga",
    description: "Kelola data keluarga dan pemetaan kepala rumah tangga jemaat.",
    href: "/admin/buku-induk-jemaat/daftar-kartu-keluarga",
  },
  {
    id: "anggota",
    label: "Anggota Jemaat",
    description: "Data jemaat utama yang dapat dicari, diedit, dan ditampilkan di daftar anggota.",
    href: "/admin/jemaat",
  },
  {
    id: "mutasi",
    label: "Mutasi Jemaat",
    description: "Atestasi masuk, atestasi keluar, dan catatan meninggal dalam satu area pengelolaan.",
    href: "/admin/buku-induk-jemaat/mutasi-jemaat",
  },
];

export default function BukuIndukJemaatPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Buku Induk Jemaat</h1>
          <p>Kelola buku induk jemaat dari satu area, termasuk daftar Kartu Keluarga, anggota jemaat, dan mutasi jemaat.</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 pb-4">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-emerald-800 text-white shadow-sm shadow-emerald-900/20"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-semibold text-slate-950">{active.label}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{active.description}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-3xl border px-5 py-6 text-left transition ${
                  tab.id === activeTab
                    ? "border-emerald-300 bg-emerald-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">{tab.id === "mutasi" ? "Mutasi" : "Daftar"}</p>
                <h3 className="mt-3 text-xl font-semibold">{tab.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tab.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={active.href} className={styles.primaryButton}>
              Buka {active.label}
            </Link>
            <span className="text-sm text-slate-500">Pilih tab lalu klik tombol untuk menuju halaman lengkap.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
