import Link from "next/link";
import { adminUi as styles } from "../../../ui";

export default function MeninggalPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Meninggal</h1>
          <p>Kelola catatan jemaat yang telah meninggal beserta status dan kebijakan administrasi.</p>
        </div>
        <Link href="/admin/buku-induk-jemaat/mutasi-jemaat" className={styles.primaryButton}>
          Buka Mutasi Jemaat
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Data meninggal akan mencatat tanggal wafat, lokasi pemakaman, dan keterangan anggota.
          Untuk saat ini, gunakan halaman Mutasi Jemaat untuk melihat sejarah dan menambah entri baru.
        </p>
      </div>
    </div>
  );
}
