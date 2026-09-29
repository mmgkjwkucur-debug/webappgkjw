"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { ArrowRight, CalendarDays, FileText, MapPin, Newspaper, Quote } from "lucide-react";
import { db } from "@/lib/firebase";

 type PublicPost = { id: string; judul?: string; ringkasan?: string; isi?: string; tanggal?: string };
 type PublicSchedule = { id: string; judul?: string; jenis?: string; tema?: string; tanggal?: unknown; waktu?: string; lokasi?: string };
 type PublicReflection = { id: string; judul?: string; isi?: string; tanggal?: string };
 type FirestoreTimestampLike = { toDate: () => Date };

function isTimestamp(value: unknown): value is FirestoreTimestampLike {
  return typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function";
}

function formatDate(value: unknown) {
  const date = isTimestamp(value) ? value.toDate() : new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(date.getTime())) return "Tanggal belum ditentukan";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function JemaatPage() {
  const [posts, setPosts] = useState<PublicPost[]>([]);
  const [schedules, setSchedules] = useState<PublicSchedule[]>([]);
  const [reflection, setReflection] = useState<PublicReflection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPortalContent() {
      try {
        const [postSnapshot, scheduleSnapshot, reflectionSnapshot] = await Promise.all([
          getDocs(query(collection(db, "posts"), where("status", "==", "published"), limit(3))),
          getDocs(query(collection(db, "jadwal_ibadah"), where("isPublic", "==", true), limit(4))),
          getDocs(query(collection(db, "renungan"), limit(1))),
        ]);

        setPosts(postSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as PublicPost[]);
        setSchedules(scheduleSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as PublicSchedule[]);
        const firstReflection = reflectionSnapshot.docs[0];
        setReflection(firstReflection ? ({ id: firstReflection.id, ...firstReflection.data() } as PublicReflection) : null);
      } catch (error) {
        console.error("Gagal memuat portal jemaat:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void loadPortalContent();
  }, []);

  const upcomingSchedules = useMemo(() => [...schedules].sort((first, second) => String(first.tanggal).localeCompare(String(second.tanggal))).slice(0, 3), [schedules]);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-8 text-white shadow-xl shadow-emerald-950/15 sm:px-9 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Portal Warga Jemaat</p>
            <h1 className="mt-4 max-w-2xl font-serif text-4xl leading-tight !text-white sm:text-5xl">Hadir, bertumbuh, dan melayani bersama.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-emerald-50/75 sm:text-base">Temukan jadwal ibadah, warta terbaru, renungan, dan layanan GKJW Jemaat Kucur dalam satu ruang.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 lg:min-w-64"><p className="text-xs uppercase tracking-[0.2em] text-emerald-100/60">Hari ini</p><p className="mt-2 text-lg font-semibold">Mari hadir dalam persekutuan.</p><Link href="/jemaat/jadwal" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-amber-200">Lihat jadwal <ArrowRight size={15} /></Link></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link href="/jemaat/jadwal" className="group rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-700/30"><CalendarDays className="text-emerald-700" size={22} /><h2 className="mt-5 font-serif text-2xl">Jadwal Ibadah</h2><p className="mt-2 text-sm leading-6 text-emerald-950/60">Lihat jadwal pelayanan dan ibadah terbaru.</p><ArrowRight className="mt-5 text-amber-700 transition group-hover:translate-x-1" size={17} /></Link>
        <Link href="/jemaat/warta" className="group rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-700/30"><Newspaper className="text-emerald-700" size={22} /><h2 className="mt-5 font-serif text-2xl">Warta Jemaat</h2><p className="mt-2 text-sm leading-6 text-emerald-950/60">Baca kabar dan pengumuman kehidupan jemaat.</p><ArrowRight className="mt-5 text-amber-700 transition group-hover:translate-x-1" size={17} /></Link>
        <Link href="/jemaat/permohonan-surat" className="group rounded-3xl border border-emerald-950/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-emerald-700/30"><FileText className="text-emerald-700" size={22} /><h2 className="mt-5 font-serif text-2xl">Layanan Jemaat</h2><p className="mt-2 text-sm leading-6 text-emerald-950/60">Sampaikan kebutuhan layanan kepada sekretariat.</p><ArrowRight className="mt-5 text-amber-700 transition group-hover:translate-x-1" size={17} /></Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Akan Datang</p><h2 className="mt-3 font-serif text-3xl">Jadwal ibadah</h2></div><Link href="/jemaat/jadwal" className="text-sm font-bold text-emerald-800">Semua jadwal</Link></div>
          <div className="mt-6 space-y-3">
            {upcomingSchedules.map((schedule) => <article key={schedule.id} className="grid gap-3 rounded-2xl bg-[#f7f5ef] p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center"><time className="text-sm font-bold text-amber-700">{formatDate(schedule.tanggal)}</time><div><h3 className="font-semibold text-emerald-950">{schedule.judul || schedule.jenis || "Ibadah Jemaat"}</h3><p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-950/55"><MapPin size={14} />{schedule.lokasi || "GKJW Jemaat Kucur"}</p></div><span className="text-sm font-bold text-emerald-800">{schedule.waktu || "-"}</span></article>)}
            {!isLoading && upcomingSchedules.length === 0 && <p className="rounded-2xl border border-dashed border-emerald-950/15 p-5 text-sm text-emerald-950/60">Belum ada jadwal yang diterbitkan.</p>}
            {isLoading && <p className="text-sm text-emerald-950/55">Memuat jadwal...</p>}
          </div>
        </div>

        <div className="rounded-3xl bg-amber-200 p-6 text-emerald-950 shadow-sm sm:p-7"><Quote className="text-amber-800" size={24} /><p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-900">Renungan hari ini</p><h2 className="mt-3 font-serif text-3xl">{reflection?.judul || "Ruang untuk merenung"}</h2><p className="mt-4 line-clamp-4 text-sm leading-7 text-emerald-950/65">{reflection?.isi?.replace(/<[^>]*>/g, " ") || "Ambil waktu sejenak untuk membaca firman dan menata hati dalam hadirat Tuhan."}</p><Link href="/jemaat/renungan" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-900">Baca renungan <ArrowRight size={15} /></Link></div>
      </section>

      <section className="rounded-3xl border border-emerald-950/10 bg-[#fffdf7] p-6 sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Kabar Terbaru</p><h2 className="mt-3 font-serif text-3xl">Warta jemaat</h2><div className="mt-6 grid gap-4 md:grid-cols-3">{posts.map((post) => <article key={post.id} className="rounded-2xl border border-emerald-950/10 bg-white p-5"><time className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800/55">{formatDate(post.tanggal)}</time><h3 className="mt-3 font-serif text-xl">{post.judul || "Warta jemaat"}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-emerald-950/60">{post.ringkasan || post.isi || "Baca informasi terbaru dari jemaat."}</p></article>)}{!isLoading && posts.length === 0 && <p className="text-sm text-emerald-950/60">Belum ada warta yang diterbitkan.</p>}</div><Link href="/jemaat/warta" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">Buka semua warta <ArrowRight size={15} /></Link></section>
    </div>
  );
}
