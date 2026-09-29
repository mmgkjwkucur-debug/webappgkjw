"use client";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getPostImageSrc } from "@/lib/cms";
import type { ChurchPost, PostCategory, PostStatus } from "@/lib/cms";
import { adminUi as styles } from "../ui";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Copy, Eye, FileUp, Search, Star } from "lucide-react";
import { uploadToDrive } from "@/lib/driveUpload";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });
const POST_CATEGORIES: PostCategory[] = ["Warta Jemaat", "Pelayanan", "Kegiatan", "Pengumuman", "Umum"];

function createSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState<"konten" | "renungan" | "editTentang">("konten");
  // RichEditor handles formatting; keep ref-based helpers removed
  const [judul, setJudul] = useState("");
  const [ringkasan, setRingkasan] = useState("");
  const [isi, setIsi] = useState("");
  const [kategori, setKategori] = useState<PostCategory>("Warta Jemaat");
  const [tags, setTags] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [fotoDriveId, setFotoDriveId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [dokumenUrl, setDokumenUrl] = useState("");
  const [dokumenDriveId, setDokumenDriveId] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [status, setStatus] = useState<PostStatus>("published");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [posts, setPosts] = useState<ChurchPost[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PostStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | PostCategory>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [previewPost, setPreviewPost] = useState<ChurchPost | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, "posts"), orderBy("tanggal", "desc")),
      (snapshot) => {
        setPosts(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })) as ChurchPost[]);
        setIsLoading(false);
      },
      (error) => {
        console.error("Gagal memuat artikel:", error);
        setIsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setJudul("");
    setRingkasan("");
    setIsi("");
    setKategori("Warta Jemaat");
    setTags("");
    setFotoUrl("");
    setFotoDriveId("");
    setVideoUrl("");
    setDokumenUrl("");
    setDokumenDriveId("");
    setFotoFile(null);
    setDocumentFile(null);
    setUploadStatus("");
    setStatus("published");
    setIsFeatured(false);
    setEditingId(null);
  };

  const handleSimpan = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!judul.trim() || !ringkasan.trim() || !isi.trim()) {
      alert("Judul, ringkasan, dan isi artikel wajib diisi.");
      return;
    }

    setIsSaving(true);
    setUploadStatus("");

    try {
      let savedFotoUrl = fotoUrl;
      let savedFotoDriveId = fotoDriveId;
      let savedDokumenUrl = dokumenUrl;
      let savedDokumenDriveId = dokumenDriveId;

      if (fotoFile) {
        setUploadStatus("Mengunggah foto ke Google Drive...");
        const uploadedPhoto = await uploadToDrive(fotoFile, "article-media");
        savedFotoUrl = uploadedPhoto.url;
        savedFotoDriveId = uploadedPhoto.fileId;
      }

      if (documentFile) {
        setUploadStatus("Mengunggah dokumen ke Google Drive...");
        const uploadedDocument = await uploadToDrive(documentFile, "article-document");
        savedDokumenUrl = uploadedDocument.url;
        savedDokumenDriveId = uploadedDocument.fileId;
      }

      const payload = {
        judul: judul.trim(),
        slug: createSlug(judul),
        kategori,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
        ringkasan: ringkasan.trim(),
        isi: isi.trim(),
        fotoUrl: savedFotoUrl.trim(),
        fotoDriveId: savedFotoDriveId.trim(),
        videoUrl: videoUrl.trim(),
        dokumenUrl: savedDokumenUrl.trim(),
        dokumenDriveId: savedDokumenDriveId.trim(),
        status,
        isFeatured,
        tanggal: editingId ? posts.find((post) => post.id === editingId)?.tanggal ?? new Date().toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorRole: "admin",
      } as const;

      if (editingId) {
        await updateDoc(doc(db, "posts", editingId), payload);
        alert("Artikel berhasil diperbarui.");
      } else {
        await addDoc(collection(db, "posts"), payload);
        alert(status === "published" ? "Artikel berhasil dipublikasikan!" : "Artikel tersimpan sebagai draft.");
      }

      resetForm();
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
    setKategori(post.kategori ?? "Warta Jemaat");
    setTags(post.tags?.join(", ") ?? "");
    setFotoUrl(post.fotoUrl ?? "");
    setFotoDriveId(post.fotoDriveId ?? "");
    setVideoUrl(post.videoUrl ?? "");
    setDokumenUrl(post.dokumenUrl ?? "");
    setDokumenDriveId(post.dokumenDriveId ?? "");
    setFotoFile(null);
    setDocumentFile(null);
    setStatus(post.status);
    setIsFeatured(post.isFeatured ?? false);
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (postId: string) => {
    const confirmed = window.confirm("Hapus artikel ini?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "posts", postId));
      if (editingId === postId) {
        cancelEdit();
      }
    } catch (e) {
      console.error(e);
      alert("Artikel gagal dihapus.");
    }
  };

  const duplicatePost = async (post: ChurchPost) => {
    try {
      await addDoc(collection(db, "posts"), {
        judul: `${post.judul} (Salinan)`,
        slug: createSlug(`${post.judul} Salinan`),
        kategori: post.kategori ?? "Umum",
        tags: post.tags ?? [],
        ringkasan: post.ringkasan,
        isi: post.isi,
        fotoUrl: post.fotoUrl ?? "",
        fotoDriveId: post.fotoDriveId ?? "",
        videoUrl: post.videoUrl ?? "",
        dokumenUrl: post.dokumenUrl ?? "",
        dokumenDriveId: post.dokumenDriveId ?? "",
        status: "draft",
        isFeatured: false,
        tanggal: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorRole: "admin",
      });
    } catch (error) {
      console.error("Gagal menduplikasi artikel:", error);
      alert("Artikel gagal diduplikasi.");
    }
  };

  const sortedPosts = useMemo(() => [...posts].sort((first, second) => new Date(second.tanggal).getTime() - new Date(first.tanggal).getTime()), [posts]);
  const filteredPosts = useMemo(() => sortedPosts.filter((post) => {
    const searchable = `${post.judul} ${post.ringkasan} ${(post.tags ?? []).join(" ")}`.toLowerCase();
    return (!searchTerm.trim() || searchable.includes(searchTerm.toLowerCase().trim()))
      && (statusFilter === "all" || post.status === statusFilter)
      && (categoryFilter === "all" || post.kategori === categoryFilter)
      && (!featuredOnly || post.isFeatured);
  }), [categoryFilter, featuredOnly, searchTerm, sortedPosts, statusFilter]);

  const publishedCount = posts.filter((post) => post.status === "published").length;
  const draftCount = posts.filter((post) => post.status === "draft").length;
  const featuredCount = posts.filter((post) => post.isFeatured).length;

  return (
    <div className={`${styles.pageStack} stack space-y-6`}>
      <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 px-6 py-8 text-white shadow-xl shadow-emerald-950/15 sm:px-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Ruang redaksi digital</p><h1 className="mt-3 font-serif text-4xl !text-white sm:text-5xl">Kelola Artikel & Web</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-emerald-50/75">Tulis, atur, pratinjau, dan terbitkan kabar GKJW Jemaat Kucur dari satu workspace.</p></div>
          <div className="flex items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-300" />Realtime aktif</span><button type="button" onClick={() => { setActiveTab("konten"); resetForm(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-full bg-amber-300 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-amber-200">+ Artikel baru</button></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === "konten" ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setActiveTab("konten")}>Artikel</button>
        <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === "renungan" ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setActiveTab("renungan")}>Renungan</button>
        <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeTab === "editTentang" ? "bg-emerald-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => setActiveTab("editTentang")}>Halaman Tentang</button>
      </div>

      {activeTab === "konten" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Total Artikel</p><p className="mt-3 text-3xl font-bold text-slate-950">{posts.length}</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Terpublikasi</p><p className="mt-3 text-3xl font-bold text-emerald-950">{publishedCount}</p></div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Draft</p><p className="mt-3 text-3xl font-bold text-amber-950">{draftCount}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Artikel Unggulan</p><p className="mt-3 flex items-center gap-2 text-3xl font-bold text-slate-950"><Star size={22} className="fill-amber-300 text-amber-500" />{featuredCount}</p></div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" placeholder="Cari judul, ringkasan, atau tag..." /></label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | PostStatus)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">Semua status</option><option value="published">Terpublikasi</option><option value="draft">Draft</option></select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as "all" | PostCategory)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">Semua kategori</option>{POST_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <label className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-700"><input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} /> Unggulan</label>
          </div>
        </>
      )}

      {activeTab === "konten" && (
        <form onSubmit={handleSimpan} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{editingId ? "Mode edit" : "Editor baru"}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{editingId ? "Perbarui artikel" : "Tulis artikel baru"}</h2></div>{editingId && <button type="button" className={styles.logoutButton} onClick={cancelEdit}>Batal edit</button>}</div>
          <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_19rem] sm:p-8">
            <div className="space-y-5">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Judul artikel<input placeholder="Contoh: Ibadah syukur dan pelayanan bulan ini" className={styles.input} value={judul} onChange={(e) => setJudul(e.target.value)} required /></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Ringkasan <span className="font-normal text-slate-500">Maksimal 280 karakter untuk kartu publik.</span><textarea placeholder="Ringkasan singkat yang mengundang pembaca..." className={styles.textarea} value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} maxLength={280} required /></label>
              <div><div className="mb-2 flex items-center justify-between"><label className="text-sm font-semibold text-slate-700">Isi artikel</label><span className="text-xs text-slate-400">Editor visual</span></div><RichTextEditor value={isi} onChange={setIsi} placeholder="Tulis isi artikel di sini..." /></div>
            </div>
            <aside className="space-y-5 rounded-2xl bg-slate-50 p-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Publikasi</p><label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">Status<select value={status} onChange={(event) => setStatus(event.target.value as PostStatus)} className={styles.select}><option value="published">Terbitkan</option><option value="draft">Simpan sebagai draft</option></select></label></div>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Kategori<select value={kategori} onChange={(event) => setKategori(event.target.value as PostCategory)} className={styles.select}>{POST_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">Tag <span className="font-normal text-slate-500">Pisahkan dengan koma</span><input placeholder="ibadah, pelayanan" className={styles.input} value={tags} onChange={(event) => setTags(event.target.value)} /></label>
              <label className="inline-flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950"><input type="checkbox" className="mt-1 accent-amber-600" checked={isFeatured} onChange={(event) => setIsFeatured(event.target.checked)} /><span>Artikel unggulan<small className="mt-1 block font-normal text-amber-900/65">Tampilkan lebih menonjol di beranda.</small></span></label>
              <div className="border-t border-slate-200 pt-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Upload media</p><label className="mt-3 grid gap-2 text-sm font-semibold text-slate-700"><span className="inline-flex items-center gap-2"><FileUp size={15} className="text-emerald-700" /> Foto sampul</span><input type="file" accept="image/jpeg,image/png,image/webp" className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs" onChange={(event) => setFotoFile(event.target.files?.[0] ?? null)} />{fotoFile ? <span className="text-xs font-normal text-emerald-700">Siap diunggah: {fotoFile.name}</span> : fotoUrl ? <span className="text-xs font-normal text-slate-500">Foto Drive tersimpan</span> : null}</label><label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700"><span className="inline-flex items-center gap-2"><FileUp size={15} className="text-emerald-700" /> Dokumen pendukung</span><input type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-xs" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} />{documentFile ? <span className="text-xs font-normal text-emerald-700">Siap diunggah: {documentFile.name}</span> : dokumenUrl ? <span className="text-xs font-normal text-slate-500">Dokumen Drive tersimpan</span> : null}</label><p className="mt-3 text-xs leading-5 text-slate-500">File dikirim aman melalui server dan disimpan ke Google Drive Apps Script. Maksimal 10 MB.</p></div>
            </aside>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span className="text-sm text-slate-500">{uploadStatus || (status === "published" ? "Artikel akan terlihat oleh publik setelah disimpan." : "Draft hanya terlihat oleh pengelola.")}</span><button type="submit" disabled={isSaving} className={styles.primaryButton}>{isSaving ? uploadStatus || "Menyimpan..." : editingId ? "Simpan perubahan" : status === "published" ? "Terbitkan artikel" : "Simpan draft"}</button></div>
        </form>
      )}

      {activeTab === "renungan" && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex flex-col gap-2 border-b border-slate-200 pb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Konten reflektif</p><h2 className="text-2xl font-bold text-slate-950">Kelola Renungan</h2><p className="text-sm leading-6 text-slate-600">Tulis renungan harian dengan editor yang sama dan terbitkan langsung ke ruang publik.</p></div>
          <RenunganManager />
        </div>
      )}

      {activeTab === "editTentang" && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7 flex flex-col gap-2 border-b border-slate-200 pb-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Halaman publik</p><h2 className="text-2xl font-bold text-slate-950">Edit Tentang Kami</h2><p className="text-sm leading-6 text-slate-600">Perbarui cerita, arah pelayanan, dan informasi identitas GKJW Jemaat Kucur.</p></div>
          <EditTentang />
        </div>
      )}

      <div className={`${styles.tablePanel} bg-white`}>
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Pustaka konten</p><h2 className="mt-1 text-xl font-bold text-slate-950">Daftar artikel</h2></div><span className="text-sm text-slate-500">Menampilkan {filteredPosts.length} dari {posts.length} artikel</span></div>
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
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{post.judul}</strong>
                    <div className={styles.helperText}>{post.ringkasan}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500"><span>{post.kategori ?? "Umum"}</span>{post.isFeatured ? <span className="inline-flex items-center gap-1 text-amber-700"><Star size={12} className="fill-amber-300" /> Unggulan</span> : null}{post.tags?.map((tag) => <span key={tag}>#{tag}</span>)}</div>
                  </td>
                  <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${post.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{post.status === "published" ? "Publik" : "Draft"}</span></td>
                  <td>{new Date(post.tanggal).toLocaleString("id-ID")}</td>
                  <td>
                    <div className={styles.formActions}>
                      <button type="button" className={styles.primaryButton} onClick={() => startEdit(post)}>
                        Edit
                      </button>
                      <button type="button" className={styles.primaryButton} onClick={() => setPreviewPost(post)} title="Pratinjau artikel">
                        <Eye size={15} />
                      </button>
                      <button type="button" className={styles.primaryButton} onClick={() => void duplicatePost(post)} title="Duplikasi sebagai draft">
                        <Copy size={15} />
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

      {previewPost && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5" onClick={() => setPreviewPost(null)}><article className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl sm:p-10" onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Pratinjau {previewPost.status === "draft" ? "Draft" : "Publik"}</p><h2 className="mt-3 font-serif text-4xl text-slate-950">{previewPost.judul}</h2><p className="mt-3 text-sm text-slate-500">{previewPost.kategori ?? "Umum"} · {new Date(previewPost.tanggal).toLocaleDateString("id-ID")}</p></div><button type="button" onClick={() => setPreviewPost(null)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">Tutup</button></div>{getPostImageSrc(previewPost) && <Image src={getPostImageSrc(previewPost)} alt={previewPost.judul} width={1400} height={735} unoptimized className="mt-7 aspect-[1.9/1] w-full rounded-2xl object-cover" />}<p className="mt-8 text-base font-medium leading-7 text-slate-700">{previewPost.ringkasan}</p><div className="prose mt-7 max-w-none" dangerouslySetInnerHTML={{ __html: previewPost.isi }} /></article></div>}
    </div>
  );
}

type ReflectionRecord = {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
};

function RenunganManager() {
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [items, setItems] = useState<ReflectionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetch = async () => {
    try {
      const snap = await getDocs(query(collection(db, "renungan"), orderBy("tanggal", "desc")));
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReflectionRecord[]);
    } catch (e) {
      console.error("Renungan fetch failed:", e);
      setErrorMessage((e as Error)?.message || String(e));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetch(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "renungan"), {
        judul: judul.trim(),
        isi: isi.trim(),
        tanggal: tanggal || new Date().toISOString(),
        authorRole: "admin",
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

  const fetch = async () => {
    try {
      const snap = await getDocs(query(collection(db, "publicMenus"), where("slug", "==", "tentang-kami")));
      if (!snap.empty) {
        const docData = snap.docs[0];
        const pageContent = docData.data().pageContent;
        setContent(typeof pageContent === "string" ? pageContent : "");
      }
    } catch (e) {
      console.error(e);
      alert("Gagal memuat konten Tentang");
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetch(), 0);
    return () => window.clearTimeout(timeoutId);
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
