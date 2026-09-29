"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function parseDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && "toDate" in (value as any) && typeof (value as any).toDate === "function") return (value as any).toDate();
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function LaporanTahunanPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [txList, setTxList] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "transaksi_keuangan"), orderBy("tanggal", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setTxList(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as DocumentData) })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const categoriesByType = useMemo(() => {
    const map = new Map<string, { nama: string; tipe: string }>();
    for (const tx of txList) {
      if (tx.nama_kategori) map.set(tx.nama_kategori, { nama: tx.nama_kategori, tipe: tx.tipe || tx.jenis_transaksi || "" });
    }
    // fallback: collect unique kategori names
    return Array.from(map.values()).sort((a, b) => a.tipe.localeCompare(b.tipe) || a.nama.localeCompare(b.nama));
  }, [txList]);

  // aggregate per category per month
  const matrix = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => i);
    const rows: Array<{ nama: string; tipe: string; months: number[]; total: number }> = [];

    const catMap = new Map<string, { tipe: string; months: number[] }>();

    for (const tx of txList) {
      const d = parseDate(tx.tanggal);
      if (!d) continue;
      if (d.getFullYear() !== year) continue;
      const m = d.getMonth();
      const nama = tx.nama_kategori || "(Tanpa Kategori)";
      const tipe = tx.tipe || tx.jenis_transaksi || "";
      if (!catMap.has(nama)) catMap.set(nama, { tipe, months: Array(12).fill(0) });
      const entry = catMap.get(nama)!;
      const val = Number(tx.nominal) || 0;
      if (tipe === "Pemasukan") entry.months[m] += val;
      else if (tipe === "Pengeluaran") entry.months[m] -= val; // store pengeluaran as negative to ease totals
      else {
        // for mutasi treat as 0 in annual report (should be neutral)
      }
    }

    for (const [nama, v] of catMap.entries()) {
      const total = v.months.reduce((s, x) => s + x, 0);
      rows.push({ nama, tipe: v.tipe, months: v.months, total });
    }

    // group Pemasukan then Pengeluaran
    rows.sort((a, b) => (a.tipe === b.tipe ? a.nama.localeCompare(b.nama) : a.tipe.localeCompare(b.tipe)));

    return rows;
  }, [txList, year]);

  const tahunAvailable = useMemo(() => {
    const s = new Set<number>();
    for (const tx of txList) {
      const d = parseDate(tx.tanggal);
      if (d) s.add(d.getFullYear());
    }
    return Array.from(s).sort((a, b) => b - a);
  }, [txList]);

  const grandTotals = useMemo(() => {
    const months = Array(12).fill(0);
    let total = 0;
    for (const r of matrix) {
      for (let i = 0; i < 12; i++) {
        months[i] += r.months[i];
      }
      total += r.total;
    }
    return { months, total };
  }, [matrix]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Laporan Tahunan</p>
            <h1 className="mt-2 text-2xl md:text-3xl leading-snug font-semibold tracking-tight text-slate-950">Matriks Akuntansi {year}</h1>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
              {tahunAvailable.length ? tahunAvailable.map((y) => <option key={y} value={y}>{y}</option>) : <option value={year}>{year}</option>}
            </select>
            <button onClick={() => window.print()} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Cetak Laporan</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Kategori</th>
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tipe</th>
                {MONTHS_SHORT.map((m) => <th key={m} className="whitespace-nowrap px-4 py-3 text-right font-semibold">{m}</th>)}
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr><td colSpan={14} className="px-4 py-6 text-center text-sm text-slate-400">Memuat data...</td></tr>
              ) : matrix.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-6 text-center text-sm text-slate-500">Tidak ada data untuk tahun ini.</td></tr>
              ) : (
                matrix.map((r) => (
                  <tr key={r.nama} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{r.nama}</td>
                    <td className="px-4 py-3 text-slate-700">{r.tipe}</td>
                    {r.months.map((v: number, i: number) => (
                      <td key={i} className="whitespace-nowrap px-4 py-3 text-right text-slate-700">{formatRupiah(v)}</td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatRupiah(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 text-slate-900">
              <tr>
                <td className="px-4 py-3 font-semibold">TOTAL</td>
                <td className="px-4 py-3">&nbsp;</td>
                {grandTotals.months.map((m, i) => (
                  <td key={i} className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatRupiah(m)}</td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatRupiah(grandTotals.total)}</td>
              </tr>
              <tr>
                <td className="px-4 py-1 font-semibold">SURPLUS/DEFISIT</td>
                <td className="px-4 py-1">&nbsp;</td>
                {grandTotals.months.map((m, i) => (
                  <td key={i} className={`whitespace-nowrap px-4 py-1 text-right font-semibold ${m >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatRupiah(m)}</td>
                ))}
                <td className={`whitespace-nowrap px-4 py-1 text-right font-semibold ${grandTotals.total >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatRupiah(grandTotals.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
