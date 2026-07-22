"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { DEFAULT_ROLE_MENU_ACCESS, getRoleLabel, normalizeMenuPaths, resolveUserRoles, type UserRole } from "@/lib/roles";
import { Home, Book, Calendar, Users, Settings, Menu, LogOut, FileText, ClipboardList, BookOpen, Sparkles, ChevronDown, ChevronRight, CircleDollarSign, HandCoins, HeartHandshake, Wallet, BadgeDollarSign, type LucideIcon } from "lucide-react";

type SidebarMenuItem = {
  name: string;
  path?: string;
  icon: LucideIcon;
  roles: UserRole[];
  children?: Array<{
    name: string;
    path: string;
    icon: LucideIcon;
    roles: UserRole[];
  }>;
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [userRoles, setUserRoles] = useState<UserRole[]>(["admin"]);
  const [userName, setUserName] = useState("Admin");
  const [allowedMenuPaths, setAllowedMenuPaths] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserRoles(["admin"]);
        setUserName("Admin");
        setAllowedMenuPaths([]);
        setIsLoading(false);
        router.push("/login");
        return;
      }

      try {
        const profileDoc = await import("firebase/firestore").then(({ getDoc }) => getDoc(doc(db, "users", user.uid)));
        if (!profileDoc.exists()) {
          await setDoc(
            doc(db, "users", user.uid),
            {
              nama: user.email?.split("@")[0] ?? "Admin",
              email: user.email ?? "",
              role: "admin",
              roles: ["admin"],
              status: "active",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }

        const roles = await resolveUserRoles(db, user);
        const profileName = profileDoc.exists() ? (profileDoc.data().nama as string | undefined) : undefined;
        const menuAccess = normalizeMenuPaths(profileDoc.exists() ? profileDoc.data().menuAccess : []);
        const resolvedRoles = (roles.length > 0 ? roles : ["admin"]) as UserRole[];
        const effectiveMenuAccess = menuAccess.length > 0 ? menuAccess : resolvedRoles.flatMap((role) => DEFAULT_ROLE_MENU_ACCESS[role as keyof typeof DEFAULT_ROLE_MENU_ACCESS] ?? []);
        setUserRoles(resolvedRoles);
        setAllowedMenuPaths(effectiveMenuAccess);
        setUserName(profileName?.trim() || user.email?.split("@")[0] || "Admin");
      } catch (error) {
        console.error("Gagal mengambil role user:", error);
        setUserRoles(["admin"]);
        setAllowedMenuPaths([]);
        setUserName("Admin");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const [expandedMenu, setExpandedMenu] = useState<string | null>(
    pathname?.startsWith("/admin/pengeluaran-kas")
      ? "Pengeluaran Kas"
      : pathname?.startsWith("/admin/penerimaan-kas")
        ? "Penerimaan Kas"
        : pathname?.startsWith("/admin/buku-induk-jemaat")
          ? "Buku Induk Jemaat"
          : pathname?.startsWith("/admin/sekretariat")
            ? "Sekretariat & Surat"
            : null,
  );

  const menuItems: SidebarMenuItem[] = [
    { name: "Dashboard", path: "/admin", icon: Home, roles: ["admin", "sekretariat", "bendahara", "phmj", "majelis", "multi_media"] },
    { name: "Kelola Artikel & Web", path: "/admin/posts", icon: Book, roles: ["admin", "multi_media"] },
    { name: "Jadwal Ibadah", path: "/admin/jadwal", icon: Calendar, roles: ["admin", "multi_media"] },
    {
      name: "Buku Induk Jemaat",
      path: "/admin/buku-induk-jemaat",
      icon: Users,
      roles: ["admin", "sekretariat", "phmj", "majelis"],
      children: [
        { name: "Daftar Kartu Keluarga (KK)", path: "/admin/buku-induk-jemaat/daftar-kartu-keluarga", icon: BookOpen, roles: ["admin", "sekretariat", "phmj", "majelis"] },
        { name: "Daftar Anggota Jemaat", path: "/admin/jemaat", icon: Users, roles: ["admin", "sekretariat", "phmj", "majelis"] },
        { name: "Mutasi Jemaat", path: "/admin/buku-induk-jemaat/mutasi-jemaat", icon: BookOpen, roles: ["admin", "sekretariat", "phmj", "majelis"] },
      ],
    },
    {
      name: "Penerimaan Kas",
      path: "/admin/penerimaan-kas",
      icon: CircleDollarSign,
      roles: ["admin", "bendahara", "multi_media"],
      children: [
        { name: "Persembahan Ibadah", path: "/admin/penerimaan-kas/persembahan-ibadah", icon: HandCoins, roles: ["admin", "bendahara", "multi_media"] },
        { name: "Persepuluhan & Syukur", path: "/admin/penerimaan-kas/persembahan-persepuluhan-syukur", icon: Wallet, roles: ["admin", "bendahara", "multi_media"] },
        { name: "Sumbangan / Donatur Khusus", path: "/admin/penerimaan-kas/sumbangan-donatur-khusus", icon: HeartHandshake, roles: ["admin", "bendahara", "multi_media"] },
      ],
    },
    {
      name: "Pengeluaran Kas",
      path: "/admin/pengeluaran-kas",
      icon: BadgeDollarSign,
      roles: ["admin", "bendahara", "multi_media"],
      children: [
        { name: "Biaya Operasional", path: "/admin/pengeluaran-kas/biaya-operasional", icon: Wallet, roles: ["admin", "bendahara", "multi_media"] },
        { name: "Dana Program Kerja / Komisi", path: "/admin/pengeluaran-kas/dana-program-kerja-komisi", icon: HandCoins, roles: ["admin", "bendahara", "multi_media"] },
        { name: "Dana Diakonia & Bantuan", path: "/admin/pengeluaran-kas/dana-diakonia-bantuan", icon: HeartHandshake, roles: ["admin", "bendahara", "multi_media"] },
      ],
    },
    {
      name: "Sekretariat & Surat",
      path: "/admin/sekretariat",
      icon: FileText,
      roles: ["admin", "sekretariat", "multi_media"],
      children: [
        { name: "Permohonan Surat", path: "/admin/sekretariat/permohonan-surat", icon: ClipboardList, roles: ["admin", "sekretariat", "multi_media"] },
        { name: "Notulensi Rapat", path: "/admin/sekretariat/notulensi-rapat", icon: BookOpen, roles: ["admin", "sekretariat", "multi_media"] },
        { name: "Asisten AI Admin", path: "/admin/sekretariat/asisten-ai", icon: Sparkles, roles: ["admin", "sekretariat", "multi_media"] },
      ],
    },
    { name: "Manajemen User", path: "/admin/users", icon: Settings, roles: ["admin"] },
  ];

  const canAccessMenu = (path?: string) => {
    if (!path) return true;
    if (userRoles.includes("admin")) return true;
    return allowedMenuPaths.includes(path);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-700">
        <p>Memeriksa Akses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-900 md:grid md:grid-cols-[18rem_minmax(0,1fr)]">
      <div
        className={`fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 md:hidden ${mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform bg-emerald-950 text-slate-100 transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex min-h-screen flex-col border-r border-emerald-900/80 bg-emerald-950/95 shadow-2xl md:border-none md:bg-emerald-950 md:overflow-y-auto">
          <div className="flex items-center gap-3 border-b border-slate-800/70 p-6">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-950 shadow-lg">
              <Image src="/icon.png" alt="GKJW" width={40} height={40} unoptimized className="h-full w-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-semibold uppercase tracking-[0.24em] text-white">GKJW</h2>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Jemaat Kucur</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto p-4">
            {menuItems
              .filter((item) => {
                const childVisible = item.children?.some((child) => canAccessMenu(child.path)) ?? false;
                return item.roles.some((role) => userRoles.includes(role as UserRole)) && (canAccessMenu(item.path) || childVisible);
              })
              .map((item) => {
                const childActive = item.children?.some((child) => pathname === child.path) ?? false;
                const isActive = pathname === item.path || childActive;
                const menuOpen = expandedMenu === item.name;
                const base = "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200";
                const inactive = "text-emerald-100/70 hover:bg-white/10 hover:text-white";
                const activeCls = "bg-white/10 text-white border-l-4 border-amber-300 pl-4";
                const itemIconProps = { size: 16, className: isActive ? "text-amber-300" : "text-emerald-200/55" };

                if (item.children && item.children.length > 0) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <button
                        type="button"
                        className={`${base} w-full justify-between rounded-2xl ${isActive ? activeCls : inactive}`}
                        onClick={() => setExpandedMenu((current) => (current === item.name ? null : item.name))}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon {...itemIconProps} />
                          <span>{item.name}</span>
                        </span>
                        {menuOpen ? <ChevronDown size={16} className="text-emerald-200" /> : <ChevronRight size={16} className="text-emerald-200" />}
                      </button>
                      {menuOpen && (
                        <div className="space-y-1 px-2">
                          {item.children
                            .filter((child) => child.roles.some((role) => userRoles.includes(role as UserRole)) && canAccessMenu(child.path))
                            .map((child) => {
                              const isChildActive = pathname === child.path;
                              return (
                                <Link
                                  key={child.path}
                                  href={child.path}
                                  className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm transition ${
                                    isChildActive
                                      ? "bg-emerald-50 text-emerald-950"
                                      : "text-emerald-100/80 hover:bg-emerald-50 hover:text-emerald-950"
                                  }`}
                                  onClick={() => setMobileNavOpen(false)}
                                >
                                  <child.icon size={14} className={isChildActive ? "text-emerald-700" : "text-emerald-200"} />
                                  <span>{child.name}</span>
                                </Link>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.path ?? "/"}
                    className={`${base} ${isActive ? activeCls : inactive}`}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    <item.icon {...itemIconProps} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
          </nav>

          <div className="border-t border-slate-800/70 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{userName}</div>
                <div className="truncate text-xs text-slate-400">{userRoles.map(getRoleLabel).join(", ")}</div>
              </div>
              <button onClick={handleLogout} className="ml-auto rounded-full p-2 text-slate-300 transition hover:text-white">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 bg-[#f7f5ef]">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
              aria-label={mobileNavOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{userName}</p>
              <p className="text-xs text-slate-500">{userRoles.map(getRoleLabel).join(", ")}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Keluar
          </button>
        </header>

        <div className="w-full min-w-0 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
