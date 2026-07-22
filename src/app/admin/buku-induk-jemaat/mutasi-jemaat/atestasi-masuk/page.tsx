import { adminUi as styles } from "../../../ui";

export default function AtestasiMasukPage() {
  return (
    <div className={`${styles.pageStack} space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Atestasi Masuk</h1>
          <p>Halaman untuk mencatat dan mengelola jemaat yang masuk dari gereja lain.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Form atestasi masuk akan dibuat pada tahap pengembangan selanjutnya.</p>
      </div>
    </div>
  );
}
