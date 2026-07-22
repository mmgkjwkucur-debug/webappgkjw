"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import type { ChurchPost, PostStatus } from "@/lib/cms";
import { adminUi as styles } from "../ui";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<"konten" | "renungan" | "editTentang">("konten");
  // RichEditor handles formatting; keep ref-based helpers removed
  const [judul, setJudul] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [isi, setIsi] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [status, setStatus] = useState<PostStatus>("published");
  const [isSaving, setIsSaving] = useState(false);
  const [posts, setPosts] = useState<ChurchPost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, "posts"), orderBy("tanggal", "desc")));
      const data = snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as ChurchPost[];
      setPosts(data);
    } catch (e) {
      console.error("Gagal memuat artikel:", e);
      alert("Gagal memuat artikel dari database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPosts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleSimpan = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!judul.trim() || !ringkasan.trim() || !isi.trim()) {
      alert("Judul, ringkasan, dan isi artikel wajib diisi.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        judul: judul.trim(),
        ringkasan: ringkasan.trim(),
        isi: isi.trim(),
        fotoUrl: fotoUrl.trim(),
        videoUrl: videoUrl.trim(),
        status,
        tanggal: new Date().toISOString(),
        authorRole: "admin_multimedia",
      } as const;

      if (editingId) {
        await updateDoc(doc(db, "posts", editingId), payload);
        alert("Artikel berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "posts"), payload);
        alert(status === "published" ? "Artikel berhasil dipublikasikan!" : "Artikel tersimpan sebagai draft.");
      }

      setJudul("");
      setRingkasan("");
      setIsi("");
      setFotoUrl("");
      setVideoUrl("");
      setStatus("published");
      setEditingId(null);
      await fetchPosts();
    } catch (e) {
      console.error(e);
      alert("Artikel gagal disimpan. Coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (post: ChurchPost) => {
    setEditingId(post.id);
    setJudul(post.judul);
    setRingkasan(post.ringkasan);
    setIsi(post.isi);
    setFotoUrl(post.fotoUrl ?? "");
    setVideoUrl(post.videoUrl ?? "");
    setStatus(post.status);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setJudul("");
    setRingkasan("");
    setIsi("");
    setFotoUrl("");
    setVideoUrl("");
    setStatus("published");
  };

  const handleDelete = async (postId: string) => {
    const confirmed = window.confirm("Hapus artikel ini?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "posts", postId));
      await fetchPosts();
      if (editingId === postId) {
        cancelEdit();
      }
    } catch (e) {
      console.error(e);
      alert("Artikel gagal dihapus.");
    }
  };

  const sortedPosts = useMemo(() => [...posts].sort((first, second) => new Date(second.tanggal).getTime() - new Date(first.tanggal).getTime()), [posts]);

  return (
    <div className={`${styles.pageStack} stack space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Kelola Artikel & Web</h1>
          <p>Kelola konten publik pada Beranda, Renungan, dan halaman statis.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className={`px-4 py-2 rounded-md ${activeTab === "konten" ? "bg-emerald-900 text-white" : "bg-white"}`} onClick={() => setActiveTab("konten")}>Konten Beranda</button>
        <button className={`px-4 py-2 rounded-md ${activeTab === "renungan" ? "bg-emerald-900 text-white" : "bg-white"}`} onClick={() => setActiveTab("renungan")}>Renungan</button>
        <button className={`px-4 py-2 rounded-md ${activeTab === "editTentang" ? "bg-emerald-900 text-white" : "bg-white"}`} onClick={() => setActiveTab("editTentang")}>Edit Tentang</button>
      </div>

      {activeTab === "konten" && (
        <form onSubmit={handleSimpan} className={`${styles.formPanel} bg-white rounded-lg p-6 shadow-sm`}>
        <div className={`${styles.formActions} flex items-center justify-between`}>
          <strong>{editingId ? "Edit artikel" : "Buat artikel baru"}</strong>
          {editingId && (
            <button type="button" className={`${styles.primaryButton} btn btn-ghost`} onClick={cancelEdit}>
              Batal edit
            </button>
          )}
        </div>
        <input 
          placeholder="Judul Artikel"
          className={`${styles.input} px-3 py-2 rounded-md`}
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
        />
        <textarea
          placeholder="Ringkasan singkat untuk ditampilkan di Beranda..."
          className={`${styles.textarea} px-3 py-2 rounded-md`}
          value={ringkasan}
          onChange={(e) => setRingkasan(e.target.value)}
        />
            <div className="mt-2">
              <RichTextEditor value={isi} onChange={setIsi} placeholder="Tulis isi artikel di sini..." />
            </div>
        <input
          placeholder="URL foto (contoh: Google Drive/Apps Script)"
          className={`${styles.input} px-3 py-2 rounded-md`}
          value={fotoUrl}
          onChange={(e) => setFotoUrl(e.target.value)}
        />
        <input
          placeholder="URL video YouTube / embed"
          className={`${styles.input} px-3 py-2 rounded-md`}
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
        />
        <div className={styles.helperText}>
          Foto dapat disimpan ke Google Drive melalui Apps Script. Video cukup masukkan link YouTube atau URL embed.
        </div>
        <div className={`${styles.formActions} flex items-center justify-between`}>
          <label className={styles.inlineField}>
            Status publikasi
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as PostStatus)}
              className={`${styles.select} ml-2 px-2 py-1 rounded-md`}
            >
              <option value="published">Publikasikan ke Beranda</option>
              <option value="draft">Simpan Draft</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className={`${styles.primaryButton} btn btn-primary`}
          >
            {isSaving ? "Menyimpan..." : editingId ? "Perbarui Konten" : "Simpan Konten"}
          </button>
        </div>
        </form>
      )}

      {activeTab === "renungan" && (
        <div className={`${styles.formPanel} bg-white rounded-lg p-6 shadow-sm`}>
          <h2 className="text-lg font-semibold">Kelola Renungan</h2>
          <p className="text-sm text-slate-600">Tambahkan atau edit renungan harian yang tampil di publik.</p>
          {/* Simple renungan manager: title, isi, tanggal */}
          <RenunganManager />
        </div>
      )}

      {activeTab === "editTentang" && (
        <div className={`${styles.formPanel} bg-white rounded-lg p-6 shadow-sm`}>
          <h2 className="text-lg font-semibold">Edit: Tentang Kami</h2>
          <p className="text-sm text-slate-600">Edit konten halaman Tentang Kami.</p>
          <EditTentang />
        </div>
      )}

      <div className={`${styles.tablePanel} bg-white rounded-lg p-4 shadow-sm`}>
        <table className={`${styles.table} min-w-full`}>
          <thead>
            <tr>
              <th>Judul</th>
              <th>Status</th>
              <th>Tanggal</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className={styles.helperText}>Memuat artikel...</td>
              </tr>
            ) : sortedPosts.length > 0 ? (
              sortedPosts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.judul}</strong>
                    <div className={styles.helperText}>{post.ringkasan}</div>
                    {post.fotoUrl ? <div className={styles.helperText}>Foto: {post.fotoUrl}</div> : null}
                    {post.videoUrl ? <div className={styles.helperText}>Video: {post.videoUrl}</div> : null}
                  </td>
                  <td>{post.status === "published" ? "Publik" : "Draft"}</td>
                  <td>{new Date(post.tanggal).toLocaleString("id-ID")}</td>
                  <td>
                    <div className={styles.formActions}>
                      <button type="button" className={styles.primaryButton} onClick={() => startEdit(post)}>
                        Edit
                      </button>
                      <button type="button" className={styles.logoutButton} onClick={() => handleDelete(post.id)}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className={styles.helperText}>Belum ada artikel yang dibuat.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

  function RenunganManager() {
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetch = async () => {
    try {
      const snap = await getDocs(query(collection(db, "renungan"), orderBy("tanggal", "desc")));
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Renungan fetch failed:", e);
      setErrorMessage((e as Error)?.message || String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "renungan"), {
        judul: judul.trim(),
        isi: isi.trim(),
        tanggal: tanggal || new Date().toISOString(),
        authorRole: "admin_multimedia",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setJudul("");
      setIsi("");
      setTanggal("");
      setErrorMessage(null);
      await fetch();
    } catch (e) {
      console.error("Renungan save failed:", e);
      setErrorMessage((e as Error)?.message || String(e));
    }
  };

  return (
    <div>
      <form onSubmit={save} className="space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Judul renungan" value={judul} onChange={(e) => setJudul(e.target.value)} />
        <div className="mt-2">
          <RichTextEditor value={isi} onChange={setIsi} placeholder="Isi renungan" />
        </div>
        <input className="w-full rounded-md border px-3 py-2" placeholder="Tanggal (ISO)" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-md bg-emerald-900 text-white" type="submit">Simpan</button>
          <button type="button" className="px-4 py-2 rounded-md bg-white" onClick={() => { setJudul(""); setIsi(""); setTanggal(""); }}>Reset</button>
        </div>
      </form>

      <div className="mt-4">
        <h3 className="font-semibold">Daftar Renungan</h3>
        {errorMessage && <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Gagal: {errorMessage}</div>}
        {isLoading ? <p>Memuat...</p> : items.length === 0 ? <p>Belum ada renungan.</p> : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="rounded-md border p-3 bg-white flex justify-between">
                <div>
                  <div className="font-semibold">{it.judul}</div>
                  <div className="text-sm text-slate-600">{new Date(it.tanggal).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded-md bg-white" onClick={async () => { await updateDoc(doc(db, "renungan", it.id), { judul: it.judul + " (edited)" }); await fetch(); }}>Edit</button>
                  <button className="px-3 py-1 rounded-md bg-white" onClick={async () => { if (confirm("Hapus renungan?")) { await deleteDoc(doc(db, "renungan", it.id)); await fetch(); } }}>Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditTentang() {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const fetch = async () => {
    try {
      const snap = await getDocs(query(collection(db, "publicMenus"), where("slug", "==", "tentang-kami")));
      if (!snap.empty) {
        const docData = snap.docs[0];
        setContent((docData.data() as any).pageContent || "");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal memuat konten Tentang");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, []);

  const save = async () => {
    try {
      const snap = await getDocs(query(collection(db, "publicMenus"), where("slug", "==", "tentang-kami")));
      if (!snap.empty) {
        const d = snap.docs[0];
        await updateDoc(doc(db, "publicMenus", d.id), { pageContent: content, updatedAt: new Date().toISOString() });
        alert("Konten Tentang berhasil diperbarui.");
      } else {
        alert("Dokumen Tentang tidak ditemukan.");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan konten Tentang");
    }
  };

  function applyFormat(action: string) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const value = el.value;
    let newValue = value;
    if (action === "bold") newValue = value.slice(0, start) + `**${value.slice(start, end)}**` + value.slice(end);
    if (action === "image") newValue = value.slice(0, start) + `![Alt](https://example.com/image.jpg)` + value.slice(end);
    if (action === "left") newValue = value.slice(0, start) + `<div style=\"text-align:left\">${value.slice(start, end)}</div>` + value.slice(end);
    setContent(newValue);
    window.requestAnimationFrame(() => { el.focus(); el.selectionStart = start; el.selectionEnd = start + (newValue.length - value.length) + (end - start); });
  }

  return (
    <div>
      <div className="mt-2">
        <RichTextEditor value={content} onChange={setContent} />
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-2 rounded-md bg-emerald-900 text-white" onClick={save}>Simpan</button>
      </div>
    </div>
  );
}
