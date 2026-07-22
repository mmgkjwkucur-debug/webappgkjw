import { CalendarDays, Newspaper } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function WartaJemaatPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-emerald-950">
      <PublicHeader />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="overflow-hidden rounded-[2.5rem] bg-emerald-900 p-8 text-white shadow-2xl shadow-emerald-950/20 sm:p-12">
          <Newspaper className="mb-8 text-amber-300" size={34} />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Pusat Informasi</p>
          <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-6xl">Pilihan Warta Jemaat</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-emerald-50/75">Pengumuman, kabar pelayanan, dan informasi penting dari kehidupan GKJW Jemaat Kucur.</p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-7 shadow-sm"><h2 className="font-serif text-2xl">Warta terbaru segera hadir</h2><p className="mt-3 leading-7 text-emerald-950/65">Warta jemaat yang diterbitkan oleh pengelola akan ditampilkan di ruang ini.</p></div>
          <div className="rounded-3xl border border-amber-300/50 bg-amber-100/70 p-7"><CalendarDays className="text-amber-700" /><p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-amber-900">Periksa jadwal</p><p className="mt-2 text-sm leading-6 text-amber-950/70">Ikuti informasi ibadah dan kegiatan melalui beranda.</p></div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
