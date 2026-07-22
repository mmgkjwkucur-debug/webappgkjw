"use client";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PublicMenu, PublicMenuStatus } from "@/lib/cms";
import { adminUi as styles } from "../ui";
import dynamic from "next/dynamic";

const RichTextEditorWrapper = dynamic(() => import("@/components/RichTextEditor"), { ssr: false });

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchMenus() {
  const snapshot = await getDocs(query(collection(db, "publicMenus"), orderBy("order", "asc")));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as PublicMenu[];
}

export default function PublicMenuPage() {
  const [menus, setMenus] = useState<PublicMenu[]>([]);
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState("");
  const [order, setOrder] = useState("1");
  const [status, setStatus] = useState<PublicMenuStatus>("published");
  const [pageTitle, setPageTitle] = useState("");
  const [pageSummary, setPageSummary] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [createPost, setCreatePost] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const parentMenus = useMemo(
    () => menus.filter((menu) => !menu.parentId && menu.status === "published"),
    [menus],
  );

  const loadMenus = async () => {
    try {
      setMenus(await fetchMenus());
    } catch (error) {
      console.error("Gagal memuat menu publik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    async function loadInitialMenus() {
      try {
        setMenus(await fetchMenus());
      } catch (error) {
        console.error("Gagal memuat menu publik:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialMenus();
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!label.trim() || !pageTitle.trim() || !pageSummary.trim() || !pageContent.trim()) {
      alert("Nama menu, judul halaman, ringkasan, dan isi halaman wajib diisi.");
      return;
    }

    const slug = createSlug(label);

    if (!slug) {
      alert("Nama menu harus mengandung huruf atau angka.");
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      const menuPayload = {
        label: label.trim(),
        slug,
        parentId,
        order: Number(order) || 1,
        status,
        pageTitle: pageTitle.trim(),
        pageSummary: pageSummary.trim(),
        pageContent: pageContent.trim(),
        ctaLabel: ctaLabel.trim(),
        ctaUrl: ctaUrl.trim(),
        createdAt: now,
        updatedAt: now,
        authorRole: "admin",
      };

      await addDoc(collection(db, "publicMenus"), menuPayload);

      if (createPost) {
        await addDoc(collection(db, "posts"), {
          judul: pageTitle.trim(),
          ringkasan: pageSummary.trim(),
          isi: pageContent.trim(),
          status,
          tanggal: now,
          authorRole: "admin",
        });
      }

      alert(createPost ? "Menu dan post berhasil dibuat." : "Menu publik berhasil dibuat.");
      setLabel("");
      setParentId("");
      setOrder("1");
      setStatus("published");
      setPageTitle("");
      setPageSummary("");
      setPageContent("");
      setCtaLabel("");
      setCtaUrl("");
      setCreatePost(false);
      setIsLoading(true);
      await loadMenus();
    } catch (error) {
      console.error("Gagal menyimpan menu publik:", error);
      alert("Menu gagal disimpan. Pastikan akun Anda memiliki role admin multimedia.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${styles.pageStack} stack space-y-6`}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Menu Publik</h1>
          <p>Buat menu dan submenu untuk Beranda publik, lengkap dengan tools pengisi konten halamannya.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className={`${styles.formPanel} bg-white rounded-lg p-6 shadow-sm`}>
        <div className={`${styles.fieldGrid} grid grid-cols-2 gap-4`}>
          <input
            className={`${styles.input} px-3 py-2 rounded-md`}
            placeholder="Nama menu, contoh: Tentang Gereja"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <select className={`${styles.select} px-3 py-2 rounded-md`} value={parentId} onChange={(event) => setParentId(event.target.value)}>
            <option value="">Menu utama</option>
            {parentMenus.map((menu) => (
              <option key={menu.id} value={menu.id}>
                Submenu dari: {menu.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`${styles.fieldGrid} grid grid-cols-2 gap-4 mt-4`}>
          <input
            className={`${styles.input} px-3 py-2 rounded-md`}
            type="number"
            min="1"
            placeholder="Urutan"
            value={order}
            onChange={(event) => setOrder(event.target.value)}
          />
          <select
            className={`${styles.select} px-3 py-2 rounded-md`}
            value={status}
            onChange={(event) => setStatus(event.target.value as PublicMenuStatus)}
          >
            <option value="published">Tampilkan di Beranda</option>
            <option value="draft">Simpan Draft</option>
          </select>
        </div>

        <div className={`${styles.toolPanel} mt-4`}>
          <div>
            <strong>Tools isi halaman menu</strong>
            <p>Konten ini akan tampil sebagai bagian halaman publik sesuai menu yang dibuat.</p>
          </div>

          <input
            className={`${styles.input} px-3 py-2 rounded-md mt-2`}
            placeholder="Judul halaman"
            value={pageTitle}
            onChange={(event) => setPageTitle(event.target.value)}
          />
          <textarea
            className={`${styles.textarea} px-3 py-2 rounded-md mt-2`}
            placeholder="Ringkasan pendek halaman"
            value={pageSummary}
            onChange={(event) => setPageSummary(event.target.value)}
          />
          <div className="mt-2">
            <div className="mb-2 flex gap-2">
              <button type="button" className="btn" onClick={() => setPageContent((s) => s + "**bold**")}>Bold</button>
              <button type="button" className="btn" onClick={() => setPageContent((s) => s + "![Alt](https://example.com/image.jpg)")}>Image</button>
              <button type="button" className="btn" onClick={() => setPageContent((s) => s + "<div style=\"text-align:left\">" )}>Left</button>
            </div>
            <div className="mt-2">
              <RichTextEditorWrapper value={pageContent} onChange={setPageContent} />
            </div>
          </div>

          <div className={`${styles.fieldGrid} grid grid-cols-2 gap-4 mt-2`}>
            <input
              className={`${styles.input} px-3 py-2 rounded-md`}
              placeholder="Label tombol opsional, contoh: Hubungi Kami"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
            />
            <input
              className={`${styles.input} px-3 py-2 rounded-md`}
              placeholder="URL tombol opsional, contoh: /kontak"
              value={ctaUrl}
              onChange={(event) => setCtaUrl(event.target.value)}
            />
          </div>
        </div>

        <div className={`${styles.formActions} mt-4 flex items-center justify-between`}>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={createPost}
              onChange={(event) => setCreatePost(event.target.checked)}
            />
            Buat juga sebagai post/pengumuman
          </label>

          <button type="submit" disabled={isSaving} className={`${styles.primaryButton} btn btn-primary`}>
            {isSaving ? "Menyimpan..." : "Simpan Menu"}
          </button>
        </div>
      </form>

      <div className={`${styles.tablePanel} bg-white rounded-lg p-4 shadow-sm mt-4`}>
        <table className={`${styles.table} min-w-full`}>
          <thead>
            <tr>
              <th>Menu</th>
              <th>Tipe</th>
              <th>Slug</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4}>Memuat menu...</td>
              </tr>
            ) : menus.length > 0 ? (
              menus.map((menu) => (
                <tr key={menu.id}>
                  <td>{menu.label}</td>
                  <td>{menu.parentId ? "Submenu" : "Menu utama"}</td>
                  <td>#{menu.slug}</td>
                  <td>{menu.status === "published" ? "Publik" : "Draft"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>Belum ada menu publik.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
