import { adminUi as styles } from "../ui";

export default function BukuIndukJemaatPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Buku Induk Jemaat</h1>
          <p>Kelola buku induk jemaat dari satu area, termasuk daftar kartu keluarga, anggota jemaat, dan mutasi jemaat.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Daftar</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Kartu Keluarga</h2>
          <p className="mt-2 text-sm text-slate-600">Kelola data keluarga dan pemetaan kepala rumah tangga jemaat.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Daftar</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Anggota Jemaat</h2>
          <p className="mt-2 text-sm text-slate-600">Data jemaat yang sebelumnya aktif di menu Data Jemaat kini berada di sub-menu ini.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Mutasi</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Jemaat</h2>
          <p className="mt-2 text-sm text-slate-600">Atestasi masuk, atestasi keluar, serta data meninggal dapat dikelola dari sini.</p>
        </div>
      </div>
    </div>
  );
}
