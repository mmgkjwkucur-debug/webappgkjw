"use client";
import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminUi as styles } from "../ui";

export default function JadwalPage() {
  const [judul, setJudul] = useState("Ibadah Minggu");
  const [tanggal, setTanggal] = useState("");
  const [waktu, setWaktu] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [pelayan, setPelayan] = useState("");
  const [catatan, setCatatan] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSimpan = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!judul.trim() || !tanggal || !waktu || !lokasi.trim()) {
      alert("Judul, tanggal, waktu, dan lokasi wajib diisi.");
      return;
    }

    setIsSaving(true);

    try {
      await addDoc(collection(db, "jadwal"), {
        judul: judul.trim(),
        tanggal,
        waktu,
        lokasi: lokasi.trim(),
        pelayan: pelayan.trim(),
        catatan: catatan.trim(),
        isPublic,
        authorRole: "admin",
      });

      alert(isPublic ? "Jadwal berhasil ditampilkan di Beranda." : "Jadwal tersimpan untuk internal.");
      setJudul("Ibadah Minggu");
      setTanggal("");
      setWaktu("");
      setLokasi("");
      setPelayan("");
      setCatatan("");
      setIsPublic(true);
    } catch (error) {
      console.error("Gagal menyimpan jadwal:", error);
      alert("Jadwal gagal disimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${styles.pageStack} stack`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Jadwal Ibadah</h1>
          <p>Jadwal publik akan otomatis muncul di bagian jadwal pada Beranda.</p>
        </div>
      </div>

      <form onSubmit={handleSimpan} className={`${styles.formPanel} bg-white rounded-lg p-6 shadow-sm`}>
        <input
          placeholder="Nama kegiatan"
          className={`${styles.input} px-3 py-2 rounded-md`}
          value={judul}
          onChange={(event) => setJudul(event.target.value)}
        />

        <div className={`${styles.fieldGrid} grid grid-cols-2 gap-4 mt-2`}>
          <input
            type="date"
            className={`${styles.input} px-3 py-2 rounded-md`}
            value={tanggal}
            onChange={(event) => setTanggal(event.target.value)}
          />
          <input
            type="time"
            className={`${styles.input} px-3 py-2 rounded-md`}
            value={waktu}
            onChange={(event) => setWaktu(event.target.value)}
          />
        </div>

        <input
          placeholder="Lokasi"
          className={`${styles.input} px-3 py-2 rounded-md mt-2`}
          value={lokasi}
          onChange={(event) => setLokasi(event.target.value)}
        />
        <input
          placeholder="Pelayan / penanggung jawab"
          className={`${styles.input} px-3 py-2 rounded-md mt-2`}
          value={pelayan}
          onChange={(event) => setPelayan(event.target.value)}
        />
        <textarea
          placeholder="Catatan tambahan"
          className={`${styles.textarea} px-3 py-2 rounded-md mt-2`}
          value={catatan}
          onChange={(event) => setCatatan(event.target.value)}
        />

        <div className={`${styles.formActions} mt-4 flex items-center justify-between`}>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
              className="h-4 w-4"
            />
            Tampilkan di Beranda publik
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className={`${styles.primaryButton} btn btn-primary`}
          >
            {isSaving ? "Menyimpan..." : "Simpan Jadwal"}
          </button>
        </div>
      </form>
    </div>
  );
}
