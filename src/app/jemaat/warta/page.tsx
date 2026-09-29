"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { Newspaper } from "lucide-react";
import { db } from "@/lib/firebase";

type Post = { id: string; judul?: string; ringkasan?: string; isi?: string; tanggal?: string };

export default function JemaatWartaPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "posts"), where("status", "==", "published"), limit(20))).then((snapshot) => {
      setPosts(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Post[]);
    }).catch((error) => console.error("Gagal memuat warta jemaat:", error)).finally(() => setLoading(false));
  }, []);

  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Portal Jemaat</p><h1 className="mt-3 font-serif text-4xl">Warta jemaat</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-950/60">Pengumuman dan kabar terbaru dari kehidupan pelayanan GKJW Jemaat Kucur.</p></div><div className="grid gap-5 md:grid-cols-2">{posts.map((post) => <article key={post.id} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm"><Newspaper className="text-emerald-700" size={21} /><time className="mt-6 block text-xs font-bold uppercase tracking-[0.18em] text-emerald-800/55">{post.tanggal || "Warta terbaru"}</time><h2 className="mt-3 font-serif text-2xl">{post.judul || "Warta jemaat"}</h2><p className="mt-3 text-sm leading-7 text-emerald-950/65">{post.ringkasan || post.isi || "Baca informasi terbaru dari jemaat."}</p></article>)}{!loading && posts.length === 0 && <p className="rounded-3xl border border-dashed border-emerald-950/15 bg-white p-8 text-sm text-emerald-950/60">Belum ada warta yang diterbitkan.</p>}{loading && <p className="text-sm text-emerald-950/60">Memuat warta...</p>}</div></section>;
}
