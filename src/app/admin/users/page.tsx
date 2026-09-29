"use client";
import { useEffect, useMemo, useState } from "react";
import { initializeApp, getApp, getApps, deleteApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, deleteDoc, getDoc, getDocs, limit, query, setDoc, where, doc, updateDoc } from "firebase/firestore";
import { auth, db, firebaseConfig } from "@/lib/firebase";
import { DEFAULT_ROLE_MENU_ACCESS, MENU_OPTIONS, ROLE_OPTIONS, UserRole, getRoleLabel, normalizeMenuPaths, normalizeRoles } from "@/lib/roles";
import { adminUi as styles } from "../ui";

type ManagedUser = {
  id: string;
  nama: string;
  username: string;
  email: string;
  roles: UserRole[];
  menuAccess: string[];
  status: "active" | "inactive";
};

type AdminAccess = {
  uid: string;
  email: string;
  projectId: string;
  documentPath: string;
  roles: UserRole[];
  role: string;
  message: string;
  canManageUsers: boolean;
  status: "checking" | "ready" | "missing" | "error";
};

type ToastType = "success" | "error" | "info";

type ToastState = {
  message: string;
  type: ToastType;
};

const secondaryAppName = "admin-user-creator";

function getCreateUserErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;

    switch (code) {
      case "auth/email-already-in-use":
        return "Email sudah terdaftar di Firebase Authentication.";
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case "auth/weak-password":
        return "Password terlalu lemah. Gunakan minimal 6 karakter.";
      case "auth/operation-not-allowed":
        return "Login Email/Password belum diaktifkan di Firebase Authentication.";
      case "permission-denied":
      case "firestore/permission-denied":
        return "Akun admin belum punya izin menulis users. Pastikan dokumen users/{UID_ADMIN} berisi roles: ['admin'] dan Firestore rules terbaru sudah di-deploy.";
      case "unavailable":
        return "Firestore sedang tidak tersedia atau jaringan bermasalah.";
      default:
        return `User gagal dibuat. Kode error: ${code ?? "unknown"}`;
    }
  }

  return "User gagal dibuat. Cek console browser untuk detail error.";
}

async function fetchManagedUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  return snapshot.docs.map((item) => {
    const data = item.data();
    const roles = normalizeRoles(data);

    return {
      id: item.id,
      nama: typeof data.nama === "string" ? data.nama : "-",
      username: typeof data.username === "string" ? data.username : "-",
      email: typeof data.email === "string" ? data.email : "-",
      roles,
      menuAccess: normalizeMenuPaths(data.menuAccess),
      status: data.status === "inactive" ? "inactive" : "active",
    } satisfies ManagedUser;
  });
}

async function fetchCurrentAdminAccess(currentUser: User | null) {
  if (!currentUser) {
    return {
      uid: "-",
      email: "-",
      projectId: firebaseConfig.projectId,
      documentPath: "-",
      roles: [],
      role: "-",
      message: "Belum ada sesi login aktif.",
      canManageUsers: false,
      status: "missing",
    } satisfies AdminAccess;
  }

  const userDoc = await getDoc(doc(db, "users", currentUser.uid));

  if (!userDoc.exists()) {
    let emailMatch = null;

    try {
      const emailMatches = currentUser.email
        ? await getDocs(query(collection(db, "users"), where("email", "==", currentUser.email)))
        : null;
      emailMatch = emailMatches && !emailMatches.empty ? emailMatches.docs[0] : null;
    } catch (error) {
      console.warn("Pencarian user berdasarkan email ditolak rules:", error);
    }

    if (emailMatch) {
      const data = emailMatch.data();
      const roles = normalizeRoles(data);
      const role = typeof data.role === "string" ? data.role : "-";
      const canManageUsers = role === "admin" || roles.includes("admin");

      return {
        uid: currentUser.uid,
        email: currentUser.email ?? "-",
        projectId: firebaseConfig.projectId,
        documentPath: `users/${emailMatch.id}`,
        roles,
        role,
        message: `Dokumen ditemukan berdasarkan email. ID dokumen saat ini: ${emailMatch.id}. Admin dapat mengelola user jika role sudah admin, namun disarankan mengganti ID dokumen menjadi UID login.`,
        canManageUsers,
        status: canManageUsers ? "ready" : "missing",
      } satisfies AdminAccess;
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email ?? "-",
      projectId: firebaseConfig.projectId,
      documentPath: `users/${currentUser.uid}`,
      roles: [],
      role: "-",
      message: "Dokumen users/{UID login} belum ditemukan di Firestore.",
      canManageUsers: false,
      status: "missing",
    } satisfies AdminAccess;
  }

  const data = userDoc.data();
  const roles = normalizeRoles(data);
  const role = typeof data.role === "string" ? data.role : "-";

  return {
    uid: currentUser.uid,
    email: currentUser.email ?? "-",
    projectId: firebaseConfig.projectId,
    documentPath: `users/${currentUser.uid}`,
    roles,
    role,
    message: "Dokumen admin berhasil dibaca.",
    canManageUsers: role === "admin" || roles.includes("admin"),
    status: "ready",
  } satisfies AdminAccess;
}

function getSecondaryAuth() {
  const app = getApps().some((item) => item.name === secondaryAppName)
    ? getApp(secondaryAppName)
    : initializeApp(firebaseConfig, secondaryAppName);

  return getAuth(app);
}

export default function UsersPage() {
  const [nama, setNama] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(["sekretariat"]);
  const [selectedMenuPaths, setSelectedMenuPaths] = useState<string[]>(DEFAULT_ROLE_MENU_ACCESS.sekretariat);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [adminAccess, setAdminAccess] = useState<AdminAccess>({
    uid: "-",
    email: "-",
    projectId: firebaseConfig.projectId,
    documentPath: "-",
    roles: [],
    role: "-",
    message: "Menunggu sesi login...",
    canManageUsers: false,
    status: "checking",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<UserRole[]>([]);
  const [editingMenuAccess, setEditingMenuAccess] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedRoleLabels = useMemo(
    () => selectedRoles.map((role) => getRoleLabel(role)).join(", "),
    [selectedRoles],
  );

  const selectedMenuLabel = useMemo(
    () => selectedMenuPaths.map((path) => MENU_OPTIONS.find((item) => item.id === path)?.label ?? path).join(", "),
    [selectedMenuPaths],
  );

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const loadUsers = async () => {
    try {
      const access = await fetchCurrentAdminAccess(auth.currentUser);
      setAdminAccess(access);
      setUsers(access.canManageUsers ? await fetchManagedUsers() : []);
    } catch (error) {
      console.error("Gagal memuat user:", error);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);

      try {
        const access = await fetchCurrentAdminAccess(user);
        setAdminAccess(access);
        setUsers(access.canManageUsers ? await fetchManagedUsers() : []);
      } catch (error) {
        console.error("Gagal memuat user:", error);
        setUsers([]);
        setAdminAccess({
          uid: user?.uid ?? "-",
          email: user?.email ?? "-",
          projectId: firebaseConfig.projectId,
          documentPath: user ? `users/${user.uid}` : "-",
          roles: [],
          role: "-",
          canManageUsers: false,
          message: "Dokumen admin tidak bisa dibaca. Biasanya rules cloud belum di-deploy atau document ID bukan UID login.",
          status: "error",
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleRole = (role: UserRole) => {
    const isSelected = selectedRoles.includes(role);
    const defaultRolePaths = DEFAULT_ROLE_MENU_ACCESS[role] ?? [];

    if (isSelected) {
      setSelectedRoles((currentRoles) => (currentRoles.length === 1 ? currentRoles : currentRoles.filter((item) => item !== role)));
      setSelectedMenuPaths((currentPaths) => currentPaths.filter((path) => !defaultRolePaths.includes(path)));
      return;
    }

    setSelectedRoles((currentRoles) => [...currentRoles, role]);
    setSelectedMenuPaths((currentPaths) => Array.from(new Set([...currentPaths, ...defaultRolePaths])));
  };

  const toggleEditingRole = (role: UserRole) => {
    const isSelected = editingRoles.includes(role);
    const defaultRolePaths = DEFAULT_ROLE_MENU_ACCESS[role] ?? [];

    if (isSelected) {
      setEditingRoles((currentRoles) => (currentRoles.length === 1 ? currentRoles : currentRoles.filter((item) => item !== role)));
      setEditingMenuAccess((currentPaths) => currentPaths.filter((path) => !defaultRolePaths.includes(path)));
      return;
    }

    setEditingRoles((currentRoles) => [...currentRoles, role]);
    setEditingMenuAccess((currentPaths) => Array.from(new Set([...currentPaths, ...defaultRolePaths])));
  };

  const toggleMenuPath = (path: string) => {
    setSelectedMenuPaths((currentPaths) => {
      if (currentPaths.includes(path)) {
        return currentPaths.filter((item) => item !== path);
      }

      return [...currentPaths, path];
    });
  };

  const toggleEditingMenuPath = (path: string) => {
    setEditingMenuAccess((currentPaths) => {
      if (currentPaths.includes(path)) {
        return currentPaths.filter((item) => item !== path);
      }

      return [...currentPaths, path];
    });
  };

  const startEditRoles = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setEditingRoles(user.roles);
    setEditingMenuAccess(user.menuAccess.length > 0 ? user.menuAccess : user.roles.flatMap((role) => DEFAULT_ROLE_MENU_ACCESS[role] ?? []));
  };

  const cancelEditRoles = () => {
    setEditingUserId(null);
    setEditingRoles([]);
    setEditingMenuAccess([]);
  };

  const handleSaveRoles = async () => {
    if (!editingUserId || editingRoles.length === 0 || !adminAccess.canManageUsers) {
      return;
    }

    setIsSaving(true);
    try {
      const targetUserRef = doc(db, "users", editingUserId);
      const targetUserSnapshot = await getDoc(targetUserRef);
      const existingData = targetUserSnapshot.exists() ? targetUserSnapshot.data() : {};
      const nextMenuAccess = Array.from(new Set(editingMenuAccess));

      await updateDoc(targetUserRef, {
        ...existingData,
        nama: typeof existingData.nama === "string" ? existingData.nama : "-",
        email: typeof existingData.email === "string" ? existingData.email : "-",
        status: existingData.status === "inactive" ? "inactive" : "active",
        createdAt: typeof existingData.createdAt === "string" ? existingData.createdAt : new Date().toISOString(),
        roles: editingRoles,
        role: editingRoles[0],
        menuAccess: nextMenuAccess,
        updatedAt: new Date().toISOString(),
      });

      showToast("Role berhasil diperbarui.", "success");
      cancelEditRoles();
      await loadUsers();
    } catch (error) {
      console.error("Gagal memperbarui role user:", error);
      showToast("Gagal memperbarui role user.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!adminAccess.canManageUsers) {
      showToast("Izin menghapus user belum aktif.", "error");
      return;
    }

    const target = users.find((item) => item.id === userId);
    if (!target) return;

    const confirmed = window.confirm(`Hapus akun ${target.email} dari daftar CMS dan akun login terkait?`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await deleteDoc(doc(db, "users", userId));
      showToast("User berhasil dihapus dari daftar CMS.", "success");
      await loadUsers();
    } catch (error) {
      console.error("Gagal menghapus user:", error);
      showToast("Gagal menghapus user dari Firestore.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent): Promise<boolean> => {
    event.preventDefault();

    if (!nama.trim() || !username.trim() || !email.trim() || password.length < 6 || selectedRoles.length === 0) {
      showToast("Nama, username, email, password minimal 6 karakter, dan minimal satu role wajib diisi.", "error");
      return false;
    }

    const normalizedUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(normalizedUsername)) {
      showToast("Username harus 3-40 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.", "error");
      return false;
    }

    if (!adminAccess.canManageUsers) {
      showToast("Izin tambah user belum aktif. Hanya akun dengan role admin yang dapat mengelola user.", "error");
      return false;
    }

    setIsSaving(true);
    const secondaryAuth = getSecondaryAuth();

    try {
      const existingUsername = await getDocs(query(collection(db, "users"), where("username", "==", normalizedUsername), limit(1)));
      if (!existingUsername.empty) {
        showToast("Username sudah digunakan. Pilih username lain.", "error");
        return false;
      }

      const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      const menuAccess = selectedMenuPaths.length > 0 ? selectedMenuPaths : selectedRoles.flatMap((role) => DEFAULT_ROLE_MENU_ACCESS[role] ?? []);

      await setDoc(doc(db, "users", credential.user.uid), {
        nama: nama.trim(),
        username: normalizedUsername,
        email: email.trim(),
        roles: selectedRoles,
        role: selectedRoles[0],
        menuAccess,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast(`User berhasil dibuat dengan role: ${selectedRoleLabels}.`, "success");
      setNama("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSelectedRoles(["sekretariat"]);
      setSelectedMenuPaths(DEFAULT_ROLE_MENU_ACCESS.sekretariat);
      setIsLoading(true);
      await loadUsers();
      return true;
    } catch (error) {
      console.error("Gagal membuat user:", error);
      showToast(getCreateUserErrorMessage(error), "error");
      return false;
    } finally {
      try {
        await signOut(secondaryAuth);
        await deleteApp(secondaryAuth.app);
      } catch {
        // Secondary app cleanup is best effort.
      }

      setIsSaving(false);
    }
  };

  return (
    <div className={`${styles.pageStack} stack space-y-6`}>
      <div className={`${styles.pageHeader} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-emerald-800">
            Admin CMS
          </span>
          <h1 className="mt-3">Manajemen User</h1>
          <p>Kelola akun CMS, tetapkan role, dan atur akses menu per role dengan kontrol yang lebih modern dan terstruktur.</p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateDrawerOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-900/25 transition hover:bg-emerald-900"
        >
          <span className="text-base">+</span>
          Tambah User
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Status Admin</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Akses pengelola user</h2>
            </div>
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${adminAccess.canManageUsers ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {adminAccess.canManageUsers ? "Aktif" : "Belum aktif"}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">UID Login</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.uid}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Email</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.email}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Project ID</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.projectId}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Document Path</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.documentPath}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Role</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.role}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Roles</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{adminAccess.roles.join(", ") || "-"}</dd>
            </div>
          </dl>

          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
            <p className="text-sm font-medium text-slate-800">{adminAccess.message}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Ringkasan</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Total akun terdaftar</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{users.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Role yang tersedia</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{ROLE_OPTIONS.length}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Role terpilih saat ini</p>
            <p className="mt-2 text-sm text-slate-600">{selectedRoleLabels || "Belum ada role yang dipilih"}</p>
            <p className="mt-2 text-sm text-slate-600">Menu terpilih: {selectedMenuLabel || "-"}</p>
          </div>
        </div>
      </div>

      <div className={styles.tablePanel}>
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Daftar User CMS</p>
              <p className="text-xs text-slate-500">Kelola status, role, dan paket menu akses tiap akun.</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`${styles.table} min-w-full`}>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="py-5">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="py-5">
                      <div className="h-4 w-44 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="py-5">
                      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="py-5">
                      <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="py-5 text-right">
                      <div className="ml-auto h-8 w-24 animate-pulse rounded-2xl bg-slate-200" />
                    </td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50/80">
                    <td>
                      <div>
                        <p className="font-semibold text-slate-900">{user.nama}</p>
                        <p className="mt-1 text-xs text-slate-500">UID: {user.id}</p>
                      </div>
                    </td>
                    <td className="font-medium text-emerald-800">{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {editingUserId === user.id ? (
                        <div className="space-y-3">
                          <div className={styles.roleGrid}>
                            {ROLE_OPTIONS.map((role) => (
                              <label key={role.id} className={styles.roleOption}>
                                <input
                                  type="checkbox"
                                  checked={editingRoles.includes(role.id as UserRole)}
                                  onChange={() => toggleEditingRole(role.id as UserRole)}
                                />
                                <span>
                                  <strong>{role.label}</strong>
                                </span>
                              </label>
                            ))}
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Akses Menu</p>
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {MENU_OPTIONS.map((menu) => (
                                <label key={menu.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={editingMenuAccess.includes(menu.id)}
                                    onChange={() => toggleEditingMenuPath(menu.id)}
                                  />
                                  <span>{menu.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(user.roles.length > 0 ? user.roles : ["-"]).map((role) => (
                            <span key={`${user.id}-${role}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {getRoleLabel(role)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {editingUserId === user.id ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                              title="Simpan perubahan role"
                              onClick={handleSaveRoles}
                              disabled={isSaving}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              title="Batal edit"
                              onClick={cancelEditRoles}
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
                              title="Edit role"
                              onClick={() => startEditRoles(user)}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              title="Hapus user"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={isSaving}
                            >
                              🗑
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={`${styles.helperText} py-10 text-center text-sm text-slate-600`}>
                    Belum ada user CMS.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast ? (
        <div className="fixed right-4 top-4 z-[60] w-full max-w-sm">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-lg ${toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : toast.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-slate-200 bg-white text-slate-900"}`}
          >
            <p className="text-sm font-semibold">{toast.message}</p>
          </div>
        </div>
      ) : null}

      {isCreateDrawerOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl shadow-slate-900/20 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700">Tambah User</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Buat akun baru</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDrawerOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg text-slate-700 transition hover:bg-slate-50"
                aria-label="Tutup drawer tambah user"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={async (event) => {
                const ok = await handleCreateUser(event);
                if (ok) {
                  setIsCreateDrawerOpen(false);
                }
              }}
              className="mt-6 space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className={`${styles.input} px-3 py-2 rounded-md`}
                  placeholder="Nama lengkap"
                  value={nama}
                  onChange={(event) => setNama(event.target.value)}
                />
                <input
                  className={`${styles.input} px-3 py-2 rounded-md`}
                  placeholder="Username login"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <input
                  className={`${styles.input} px-3 py-2 rounded-md md:col-span-2`}
                  type="email"
                  placeholder="Email login"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <input
                className={`${styles.input} px-3 py-2 rounded-md`}
                type="password"
                placeholder="Password awal minimal 6 karakter"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Pilih role</p>
                <div className={`${styles.roleGrid} mt-3`}>
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.id} className={`${styles.roleOption} flex items-start gap-3 p-3`}>
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={() => toggleRole(role.id)}
                      />
                      <span>
                        <strong>{role.label}</strong>
                        <small className="block text-sm text-slate-500">{role.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Akses menu yang diizinkan</p>
                <p className="mt-1 text-xs text-slate-500">Admin dapat memilih menu tertentu yang bisa diakses oleh role terpilih.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {MENU_OPTIONS.map((menu) => (
                    <label key={menu.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedMenuPaths.includes(menu.id)}
                        onChange={() => toggleMenuPath(menu.id)}
                      />
                      <span>{menu.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-slate-700">
                <p><strong>Role terpilih:</strong> {selectedRoleLabels || "-"}</p>
                <p className="mt-2"><strong>Menu terpilih:</strong> {selectedMenuLabel || "-"}</p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setIsCreateDrawerOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className={`${styles.primaryButton}`}>
                  {isSaving ? "Membuat User..." : "Simpan User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
