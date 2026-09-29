import Link from "next/link";
import { adminUi as styles } from "../../ui";

export default function DaftarKartuKeluargaPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Daftar Kartu Keluarga (KK)</h1>
          <p>Halaman ini menyiapkan manajemen Kartu Keluarga jemaat dan penyajian informasi keluarga secara terstruktur.</p>
        </div>
        <Link href="/admin/buku-induk-jemaat" className={styles.primaryButton}>
          Kembali ke Buku Induk Jemaat
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          Modul KK akan dilengkapi dengan pencarian keluarga, pemetaan kepala keluarga, dan ekspor data.
          Untuk sementara, gunakan menu utama Buku Induk Jemaat untuk melihat ringkasan dan akses daftar anggota.
        </p>
      </div>
    </div>
  );
}
