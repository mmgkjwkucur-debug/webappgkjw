import { adminUi as styles } from "../../../ui";

export default function AtestasiKeluarPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Atestasi Keluar</h1>
          <p>Halaman untuk mencatat jemaat yang keluar atau pindah ke gereja lain.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Form atestasi keluar akan dibuat pada tahap pengembangan selanjutnya.</p>
      </div>
    </div>
  );
}
