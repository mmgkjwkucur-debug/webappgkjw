import { adminUi as styles } from "../../../ui";

export default function MeninggalPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Meninggal</h1>
          <p>Halaman untuk mencatat data jemaat yang meninggal.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Form catatan meninggal akan dibuat pada tahap pengembangan selanjutnya.</p>
      </div>
    </div>
  );
}
