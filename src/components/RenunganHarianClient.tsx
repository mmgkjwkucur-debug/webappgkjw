"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/cms";

type RenunganItem = {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  authorRole?: string;
};

export default function RenunganHarianClient() {
  const [items, setItems] = useState<RenunganItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRenungan() {
      try {
        const snapshot = await getDocs(query(collection(db, "renungan"), orderBy("tanggal", "desc")));
        setItems(snapshot.docs.map((doc) => {
          const data = doc.data() as Omit<RenunganItem, "id">;
          return { id: doc.id, ...data };
        }));
      } catch (err) {
        console.error("Gagal memuat renungan:", err);
        setError((err as Error)?.message || "Gagal memuat renungan.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadRenungan();
  }, []);

  if (isLoading) {
    return <p className="text-center text-sm text-emerald-950/70">Memuat renungan...</p>;
  }

  if (error) {
    return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-3xl border border-emerald-950/10 bg-white p-8 text-center text-sm text-emerald-950/70">Belum ada renungan yang diterbitkan.</div>;
  }

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <article key={item.id} className="rounded-[2rem] border border-emerald-950/10 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-amber-500">Renungan</p>
              <h2 className="mt-3 text-3xl font-serif text-emerald-950">{item.judul}</h2>
            </div>
            <time className="text-sm font-semibold text-emerald-950/60">{formatDate(item.tanggal)}</time>
          </div>
          <div className="prose prose-emerald mt-7 max-w-none text-emerald-950" dangerouslySetInnerHTML={{ __html: item.isi || "" }} />
        </article>
      ))}
    </div>
  );
}
