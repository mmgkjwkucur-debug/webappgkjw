"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Newspaper, X } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChurchPost, PublicMenu, WorshipSchedule, formatDate } from "@/lib/cms";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function HomeClient() {
  const [posts, setPosts] = useState<ChurchPost[]>([]);
  const [schedules, setSchedules] = useState<WorshipSchedule[]>([]);
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ChurchPost | null>(null);

  useEffect(() => {
    async function loadHomepageContent() {
      try {
        const [postSnapshot, scheduleSnapshot, menuSnapshot] = await Promise.all([
          getDocs(query(collection(db, "posts"), where("status", "==", "published"))),
          getDocs(query(collection(db, "jadwal_ibadah"), where("isPublic", "==", true))),
          getDocs(query(collection(db, "publicMenus"), where("status", "==", "published"))),
        ]);

        setPosts(postSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as ChurchPost[]);
        setSchedules(scheduleSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as WorshipSchedule[]);
        setMenus(
          menuSnapshot.docs
            .map((document) => ({ id: document.id, ...document.data() } as PublicMenu))
            .filter((menu) => menu.status === "published")
            .sort((first, second) => first.order - second.order),
        );
      } catch (error) {
        console.error("Gagal memuat konten Beranda:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomepageContent();
  }, []);

  const latestPosts = useMemo(() => [...posts].sort((first, second) => new Date(second.tanggal).getTime() - new Date(first.tanggal).getTime()).slice(0, 3), [posts]);
  const upcomingSchedules = useMemo(() => [...schedules].sort((first, second) => new Date(first.tanggal).getTime() - new Date(second.tanggal).getTime()).slice(0, 4), [schedules]);
  const mainMenus = useMemo(() => menus.filter((menu) => !menu.parentId), [menus]);
  const getSubmenus = (parentId: string) => menus.filter((menu) => menu.parentId === parentId);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f5ef] text-emerald-950">
      <PublicHeader />

      <section className="relative isolate overflow-hidden bg-emerald-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.22),transparent_24%),radial-gradient(circle_at_90%_85%,rgba(16,185,129,0.26),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
          <div className="self-center">
            <p className="text-xs font-bold uppercase tracking-[0.32em] text-amber-300">GKJW Jemaat Kucur</p>
            <h1 className="!text-white mt-6 max-w-3xl font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">Iman yang bertumbuh. Kasih yang menghidupkan.</h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-emerald-50/75 sm:text-lg">Ruang bersama untuk beribadah, saling menguatkan, dan menjadi berkat bagi lingkungan sekitar.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href="#jadwal" className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-6 py-3.5 text-sm font-bold text-emerald-950 transition hover:bg-amber-200">Lihat Jadwal Ibadah <ArrowRight size={16} /></a>
              <Link href="/tentang-kami" className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">Mengenal Kami</Link>
            </div>
          </div>
          <aside className="self-start rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/10 backdrop-blur-sm sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200">Minggu Ini</p>
            <div className="mt-7 space-y-5">
              {upcomingSchedules.slice(0, 2).map((schedule) => (
                <div key={schedule.id} className="border-b border-white/10 pb-5 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-amber-200">{formatDate(schedule.tanggal)}</p>
                  <h2 className="!text-white mt-2 text-xl font-bold">{schedule.judul}</h2>
                  <p className="mt-2 flex items-center gap-2 text-sm text-emerald-50/70"><MapPin size={15} /> {schedule.lokasi}</p>
                </div>
              ))}
              {!isLoading && upcomingSchedules.length === 0 && <p className="text-sm leading-6 text-emerald-50/70">Jadwal ibadah akan ditampilkan di sini setelah diterbitkan oleh pengelola.</p>}
              {isLoading && <p className="text-sm text-emerald-50/70">Menyiapkan informasi terbaru…</p>}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[{ number: "1968", label: "Awal persekutuan di Kucur" }, { number: "176", label: "Jemaat mandiri GKJW" }, { number: "2022", label: "Tahun pendewasaan jemaat" }].map((item) => (
            <div key={item.number} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm"><p className="font-serif text-4xl text-emerald-900">{item.number}</p><p className="mt-3 text-sm font-medium text-emerald-950/65">{item.label}</p></div>
          ))}
        </div>
      </section>

      <section className="border-y border-emerald-950/10 bg-[#fffdf7] py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Kabar Jemaat</p><h2 className="mt-4 font-serif text-4xl sm:text-5xl">Cerita & pengumuman terbaru</h2></div>{isLoading && <span className="text-sm text-emerald-950/50">Memuat konten…</span>}</div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {latestPosts.length > 0 ? latestPosts.map((post, index) => (
              <button key={post.id} type="button" onClick={() => setSelectedPost(post)} className={`group rounded-[2rem] p-7 text-left transition hover:-translate-y-1 ${index === 0 ? "bg-emerald-900 text-white shadow-xl shadow-emerald-950/20" : "border border-emerald-950/10 bg-white hover:border-emerald-700/30"}`}>
                <Newspaper size={20} className={index === 0 ? "text-amber-300" : "text-emerald-700"} /><time className={`mt-8 block text-xs font-bold uppercase tracking-[0.2em] ${index === 0 ? "text-emerald-100/65" : "text-emerald-800/60"}`}>{formatDate(post.tanggal)}</time><h3 className="mt-3 font-serif text-2xl leading-tight">{post.judul}</h3><p className={`mt-4 line-clamp-3 text-sm leading-7 ${index === 0 ? "text-emerald-50/75" : "text-emerald-950/65"}`}>{post.ringkasan}</p><span className={`mt-7 inline-flex items-center gap-2 text-sm font-bold ${index === 0 ? "text-amber-200" : "text-emerald-800"}`}>Baca selengkapnya <ArrowRight size={15} /></span>
              </button>
            )) : <div className="rounded-3xl border border-dashed border-emerald-950/20 bg-white p-8 text-sm leading-7 text-emerald-950/60">Belum ada artikel publik yang diterbitkan.</div>}
          </div>
        </div>
      </section>

      {mainMenus.length > 0 && <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Tentang Pelayanan</p><div className="mt-4 max-w-2xl"><h2 className="font-serif text-4xl sm:text-5xl">Bertumbuh bersama dalam setiap karya pelayanan</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-2">{mainMenus.map((menu) => <article key={menu.id} id={menu.slug} className="rounded-[2rem] border border-emerald-950/10 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">{menu.label}</p><h3 className="mt-4 font-serif text-3xl">{menu.pageTitle}</h3><p className="mt-4 leading-7 text-emerald-950/65">{menu.pageSummary}</p><p className="mt-5 text-sm leading-7 text-emerald-950/60">{menu.pageContent}</p>{menu.ctaLabel && menu.ctaUrl && <a href={menu.ctaUrl} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-emerald-800">{menu.ctaLabel} <ArrowRight size={15} /></a>}{getSubmenus(menu.id).map((submenu) => <div key={submenu.id} id={submenu.slug} className="mt-6 rounded-2xl bg-[#f7f5ef] p-5"><h4 className="font-serif text-xl">{submenu.pageTitle}</h4><p className="mt-2 text-sm leading-6 text-emerald-950/65">{submenu.pageSummary}</p></div>)}</article>)}</div></section>}

      <section id="jadwal" className="bg-emerald-900 py-16 text-white lg:py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Jadwal Pelayanan</p><h2 className="mt-4 font-serif text-4xl sm:text-5xl">Mari hadir & bersekutu</h2></div><CalendarDays className="text-amber-300" size={34} /></div><div className="mt-10 grid gap-4">{upcomingSchedules.length > 0 ? upcomingSchedules.map((schedule) => <article key={schedule.id} className="grid gap-4 rounded-3xl border border-white/10 bg-white/8 p-6 sm:grid-cols-[150px_1fr_auto] sm:items-center"><time className="text-sm font-bold text-amber-200">{formatDate(schedule.tanggal)}</time><div><h3 className="text-xl font-bold">{schedule.judul}</h3><p className="mt-2 flex items-center gap-2 text-sm text-emerald-50/70"><MapPin size={15} /> {schedule.lokasi}</p></div><p className="text-lg font-bold text-amber-100 sm:text-right">{schedule.waktu}</p></article>) : <p className="rounded-3xl border border-dashed border-white/20 p-8 text-emerald-50/70">Belum ada jadwal yang diterbitkan.</p>}</div></div></section>

      {selectedPost && <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/70 p-5 backdrop-blur-sm" onClick={() => setSelectedPost(null)}><article className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-[#fffdf7] p-7 shadow-2xl sm:p-10" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedPost(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-950 text-white"><X size={18} /></button><time className="mt-6 block text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">{formatDate(selectedPost.tanggal)}</time><h2 className="mt-4 font-serif text-4xl leading-tight">{selectedPost.judul}</h2><p className="mt-5 font-medium leading-7 text-emerald-950/70">{selectedPost.ringkasan}</p><div className="mt-8 whitespace-pre-wrap leading-8 text-emerald-950/75">{selectedPost.isi}</div></article></div>}
      <PublicFooter />
    </main>
  );
}
