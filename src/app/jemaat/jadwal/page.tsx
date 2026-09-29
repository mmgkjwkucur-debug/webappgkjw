"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { MapPin } from "lucide-react";
import { db } from "@/lib/firebase";

type Schedule = { id: string; judul?: string; jenis?: string; tanggal?: unknown; waktu?: string; lokasi?: string; tema?: string };
type TimestampLike = { toDate: () => Date };

function formatDate(value: unknown) {
  const date = typeof value === "object" && value !== null && "toDate" in value && typeof (value as TimestampLike).toDate === "function" ? (value as TimestampLike).toDate() : new Date(typeof value === "string" ? value : "");
  return Number.isNaN(date.getTime()) ? "Tanggal belum ditentukan" : new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function JemaatSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "jadwal_ibadah"), where("isPublic", "==", true))).then((snapshot) => {
      setSchedules(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Schedule[]);
    }).catch((error) => console.error("Gagal memuat jadwal jemaat:", error)).finally(() => setLoading(false));
  }, []);

  return <section className="space-y-6"><div><p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Portal Jemaat</p><h1 className="mt-3 font-serif text-4xl">Jadwal ibadah</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-950/60">Ikuti jadwal ibadah dan pelayanan terbaru GKJW Jemaat Kucur.</p></div><div className="grid gap-4">{schedules.map((schedule) => <article key={schedule.id} className="rounded-3xl border border-emerald-950/10 bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-bold text-amber-700">{formatDate(schedule.tanggal)}</p><h2 className="mt-2 font-serif text-2xl">{schedule.judul || schedule.jenis || "Ibadah Jemaat"}</h2><p className="mt-2 flex items-center gap-2 text-sm text-emerald-950/60"><MapPin size={15} />{schedule.lokasi || "GKJW Jemaat Kucur"}</p></div><p className="text-lg font-bold text-emerald-800">{schedule.waktu || "-"}</p></div>{schedule.tema && <p className="mt-5 border-t border-emerald-950/10 pt-4 text-sm leading-6 text-emerald-950/65">{schedule.tema}</p>}</article>)}{!loading && schedules.length === 0 && <p className="rounded-3xl border border-dashed border-emerald-950/15 bg-white p-8 text-sm text-emerald-950/60">Belum ada jadwal yang diterbitkan.</p>}{loading && <p className="text-sm text-emerald-950/60">Memuat jadwal...</p>}</div></section>;
}
