import Link from "next/link";
import { adminUi as styles } from "../../../ui";

export default function AtestasiMasukPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Atestasi Masuk</h1>
          <p>Kelola jemaat yang masuk melalui atestasi dari gereja lain.</p>
        </div>
        <Link href="/admin/buku-induk-jemaat/mutasi-jemaat" className={styles.primaryButton}>
          Buka Mutasi Jemaat
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Fitur ini sedang disiapkan untuk mencatat data jemaat baru, gereja asal, tanggal atestasi, dan nomor surat atestasi.
          Selama pengembangan, gunakan halaman Mutasi Jemaat untuk melihat dan menambah data mutasi.
        </p>
      </div>
    </div>
  );
}
