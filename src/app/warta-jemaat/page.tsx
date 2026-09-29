"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, getDocs, query, where } from "firebase/firestore";
import { CalendarDays, Newspaper, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { getPostImageSrc } from "@/lib/cms";
import type { ChurchPost } from "@/lib/cms";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

export default function WartaJemaatPage() {
  const [posts, setPosts] = useState<ChurchPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ChurchPost | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, "posts"), where("status", "==", "published")))
      .then((snapshot) => {
        const items = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ChurchPost[];
        setPosts(items.sort((first, second) => new Date(second.tanggal).getTime() - new Date(first.tanggal).getTime()));
      })
      .catch((error) => console.error("Gagal memuat warta jemaat:", error))
      .finally(() => setIsLoading(false));
  }, []);

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
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between gap-4"><h2 className="font-serif text-2xl">Warta terbaru</h2>{isLoading && <span className="text-sm text-emerald-950/50">Memuat...</span>}</div>
            <div className="mt-5 space-y-3">
              {posts.map((post) => <button key={post.id} type="button" onClick={() => setSelectedPost(post)} className="block w-full rounded-2xl border border-emerald-950/10 p-4 text-left transition hover:border-emerald-700/30 hover:bg-[#f7f5ef]">{getPostImageSrc(post) && <Image src={getPostImageSrc(post)} alt={post.judul} width={900} height={470} unoptimized className="mb-4 aspect-[1.9/1] w-full rounded-xl object-cover" />}<time className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800/55">{new Date(post.tanggal).toLocaleDateString("id-ID")}</time><h3 className="mt-2 font-serif text-xl">{post.judul}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-emerald-950/60">{post.ringkasan}</p></button>)}
              {!isLoading && posts.length === 0 && <p className="rounded-2xl border border-dashed border-emerald-950/15 p-5 text-sm leading-7 text-emerald-950/60">Belum ada warta jemaat yang diterbitkan.</p>}
            </div>
          </div>
          <div className="rounded-3xl border border-amber-300/50 bg-amber-100/70 p-7"><CalendarDays className="text-amber-700" /><p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-amber-900">Periksa jadwal</p><p className="mt-2 text-sm leading-6 text-amber-950/70">Ikuti informasi ibadah dan kegiatan melalui beranda.</p></div>
        </div>
      </section>
      {selectedPost && <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/70 p-5 backdrop-blur-sm" onClick={() => setSelectedPost(null)}><article className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#fffdf7] p-7 shadow-2xl sm:p-10" onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => setSelectedPost(null)} className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-950 text-white" aria-label="Tutup warta"><X size={18} /></button>{getPostImageSrc(selectedPost) && <Image src={getPostImageSrc(selectedPost)} alt={selectedPost.judul} width={1400} height={735} unoptimized className="mt-5 aspect-[1.9/1] w-full rounded-2xl object-cover" />}<time className="mt-5 block text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{new Date(selectedPost.tanggal).toLocaleDateString("id-ID")}</time><h2 className="mt-4 font-serif text-4xl">{selectedPost.judul}</h2><p className="mt-5 font-medium leading-7 text-emerald-950/70">{selectedPost.ringkasan}</p><div className="prose mt-7 max-w-none whitespace-pre-wrap leading-8" dangerouslySetInnerHTML={{ __html: selectedPost.isi }} /></article></div>}
      <PublicFooter />
    </main>
  );
}
