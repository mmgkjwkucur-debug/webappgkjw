import { BookOpenText, Quote } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";
import RenunganHarianClient from "@/components/RenunganHarianClient";

export default function RenunganHarianPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-emerald-950">
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-5 py-16 lg:py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-300/40 bg-[#fffdf7] p-8 shadow-xl shadow-emerald-950/5 sm:p-14">
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-amber-200/50 blur-3xl" />
          <BookOpenText className="relative text-emerald-800" size={34} />
          <p className="relative mt-8 text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Ruang Teduh</p>
          <h1 className="relative mt-4 font-serif text-4xl leading-tight sm:text-6xl">Renungan Harian</h1>
          <p className="relative mt-6 max-w-2xl text-base leading-8 text-emerald-950/65">Ambil waktu sejenak untuk membaca, merenungkan firman, dan menata hati dalam hadirat Tuhan.</p>
          <div className="relative mt-12 rounded-3xl bg-emerald-950 p-7 text-emerald-50 sm:p-9">
            <Quote className="text-amber-300" size={24} />
            <p className="mt-5 font-serif text-2xl leading-relaxed">“Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.”</p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Mazmur 119:105</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="rounded-[2.5rem] border border-emerald-950/10 bg-white/90 p-8 shadow-xl sm:p-12">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-400">Renungan Harian</p>
            <h2 className="mt-4 text-4xl font-serif text-emerald-950">Berita firman setiap hari</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-emerald-950/70">Temukan renungan terbaru yang dapat membimbing langkah dan hati dalam kehidupan sehari-hari.</p>
          </div>
          <RenunganHarianClient />
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
