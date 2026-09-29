"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DOMPET_OPTIONS = ["Semua", "Kas Tunai", "Rekening Bank"] as const;

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

export default function BukuKasPage() {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth());
  const [year, setYear] = useState<number>(now.getFullYear());
  const [dompet, setDompet] = useState<string>("Semua");

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

  // compute starting balance and filtered transactions
  const { startingBalance, monthTx } = useMemo(() => {
    const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
    const nextMonth = new Date(year, month + 1, 1, 0, 0, 0, 0);

    let start = 0;

    const inMonth: DocumentData[] = [];

    for (const tx of txList) {
      const t = parseDate(tx.tanggal) as Date | null;
      if (!t) continue;

      if (t < firstDay) {
        // starting balance contribution
        if (tx.jenis_transaksi === "Pemasukan") {
          if (dompet === "Semua" || tx.dompet_penyimpanan === dompet) start += Number(tx.nominal) || 0;
        } else if (tx.jenis_transaksi === "Pengeluaran") {
          if (dompet === "Semua" || tx.dompet_penyimpanan === dompet) start -= Number(tx.nominal) || 0;
        } else if (tx.jenis_transaksi === "Mutasi") {
          const field = String(tx.dompet_penyimpanan || "");
          const arrow = field.includes("→") ? "→" : field.includes("->") ? "->" : "→";
          const parts = field.split(arrow).map((s) => s.trim());
          const from = parts[0] ?? "";
          const to = parts[1] ?? "";
          if (dompet === "Semua") {
            // ignore mutasi for combined view (net zero)
          } else {
            if (to === dompet) start += Number(tx.nominal) || 0;
            if (from === dompet) start -= Number(tx.nominal) || 0;
          }
        }
      }

      if (t >= firstDay && t < nextMonth) {
        inMonth.push(tx);
      }
    }

    // sort inMonth by tanggal asc
    inMonth.sort((a, b) => {
      const da = parseDate(a.tanggal) as Date | null;
      const db = parseDate(b.tanggal) as Date | null;
      return (da?.getTime() ?? 0) - (db?.getTime() ?? 0);
    });

    return { startingBalance: start, monthTx: inMonth };
  }, [txList, month, year, dompet]);

  // compute running balances
  const rows = useMemo(() => {
    const result: Array<any> = [];
    let balance = startingBalance;
    // push starting balance row
    result.push({ isStarting: true, saldo: balance });

    for (const tx of monthTx) {
      const t = parseDate(tx.tanggal) as Date | null;
      if (!t) continue;

      let debit = 0;
      let credit = 0;
      if (tx.jenis_transaksi === "Pemasukan") {
        if (dompet === "Semua" || tx.dompet_penyimpanan === dompet) {
          debit = Number(tx.nominal) || 0;
          balance += debit;
        }
      } else if (tx.jenis_transaksi === "Pengeluaran") {
        if (dompet === "Semua" || tx.dompet_penyimpanan === dompet) {
          credit = Number(tx.nominal) || 0;
          balance -= credit;
        }
      } else if (tx.jenis_transaksi === "Mutasi") {
        const field = String(tx.dompet_penyimpanan || "");
        const arrow = field.includes("→") ? "→" : field.includes("->") ? "->" : "→";
        const parts = field.split(arrow).map((s) => s.trim());
        const from = parts[0] ?? "";
        const to = parts[1] ?? "";
        if (dompet === "Semua") {
          // ignore mutasi for combined view
        } else {
          if (to === dompet) {
            debit = Number(tx.nominal) || 0;
            balance += debit;
          }
          if (from === dompet) {
            credit = Number(tx.nominal) || 0;
            balance -= credit;
          }
        }
      }

      result.push({
        id: tx.id,
        tanggal: parseDate(tx.tanggal),
        keterangan: tx.keterangan || tx.nama_kategori || tx.jenis_transaksi,
        kategori: tx.nama_kategori || "-",
        dompet: tx.dompet_penyimpanan || "-",
        debit,
        credit,
        saldo: balance,
      });
    }

    return result;
  }, [monthTx, startingBalance, dompet]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const tx of txList) {
      const d = parseDate(tx.tanggal);
      if (d) set.add(d.getFullYear());
    }
    const arr = Array.from(set).sort((a, b) => b - a);
    if (!arr.includes(now.getFullYear())) arr.unshift(now.getFullYear());
    return arr;
  }, [txList]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Buku Kas Umum</p>
          <h1 className="mt-2 text-2xl md:text-3xl leading-snug font-semibold tracking-tight text-slate-950">Ledger Harian</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Lihat mutasi kas harian dan saldo berjalan per dompet.</p>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm">
              <div className="text-sm font-medium text-slate-700">Bulan</div>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <div className="text-sm font-medium text-slate-700">Tahun</div>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <div className="text-sm font-medium text-slate-700">Dompet</div>
              <select value={dompet} onChange={(e) => setDompet(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                {DOMPET_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>

            <div className="ml-auto text-sm text-slate-700">Saldo Awal: <span className="font-semibold">{formatRupiah(startingBalance)}</span></div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Tanggal</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Keterangan</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Kategori</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Dompet</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Debet</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Kredit</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-400">Memuat transaksi...</td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">Tidak ada transaksi untuk bulan ini.</td>
                  </tr>
                ) : (
                  rows.map((r: any, idx: number) => {
                    if (r.isStarting) {
                      return (
                        <tr key={`start-${idx}`} className="bg-slate-50">
                          <td className="px-4 py-4 text-slate-700">&nbsp;</td>
                          <td className="px-4 py-4 text-slate-700">Saldo Awal Bulan</td>
                          <td className="px-4 py-4 text-slate-700">&nbsp;</td>
                          <td className="px-4 py-4 text-slate-700">&nbsp;</td>
                          <td className="px-4 py-4 text-right text-slate-700">-</td>
                          <td className="px-4 py-4 text-right text-slate-700">-</td>
                          <td className="px-4 py-4 text-right font-semibold text-slate-900">{formatRupiah(r.saldo)}</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-4 text-slate-700">{r.tanggal ? new Date(r.tanggal).toLocaleDateString("id-ID") : "-"}</td>
                        <td className="px-4 py-4 text-slate-700">{r.keterangan}</td>
                        <td className="px-4 py-4 text-slate-700">{r.kategori}</td>
                        <td className="px-4 py-4 text-slate-700">{r.dompet}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">{r.debit ? formatRupiah(r.debit) : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-slate-700">{r.credit ? formatRupiah(r.credit) : "-"}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-slate-900">{formatRupiah(r.saldo)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
