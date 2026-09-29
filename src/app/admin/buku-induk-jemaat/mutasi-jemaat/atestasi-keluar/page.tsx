import Link from "next/link";
import { adminUi as styles } from "../../../ui";

export default function AtestasiKeluarPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Atestasi Keluar</h1>
          <p>Kelola jemaat yang pindah atau keluar dari keanggotaan gereja.</p>
        </div>
        <Link href="/admin/buku-induk-jemaat/mutasi-jemaat" className={styles.primaryButton}>
          Buka Mutasi Jemaat
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Modul atestasi keluar akan mencatat jemaat tujuan, tanggal atestasi, dan status terbaru.
          Gunakan halaman Mutasi Jemaat untuk melihat ringkasan data dan kelola mutasi saat ini.
        </p>
      </div>
    </div>
  );
}
