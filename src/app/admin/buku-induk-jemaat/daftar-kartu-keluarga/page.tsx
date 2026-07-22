import { adminUi as styles } from "../../ui";

export default function DaftarKartuKeluargaPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Daftar Kartu Keluarga (KK)</h1>
          <p>Halaman ini siap digunakan untuk mengelola daftar keluarga jemaat dan data kartu keluarga.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Fitur daftar KK akan dikembangkan lebih lanjut sesuai kebutuhan administrasi jemaat.</p>
      </div>
    </div>
  );
}
