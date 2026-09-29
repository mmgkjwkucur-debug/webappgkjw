"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { resolveUserRoles } from "@/lib/roles";
import { CalendarDays, FileText, Home, LogOut, Menu, MessagesSquare, Newspaper, Quote, X } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

const navigation = [
  { href: "/jemaat", label: "Beranda", icon: Home },
  { href: "/jemaat/jadwal", label: "Jadwal Ibadah", icon: CalendarDays },
  { href: "/jemaat/warta", label: "Warta Jemaat", icon: Newspaper },
  { href: "/jemaat/renungan", label: "Renungan", icon: Quote },
  { href: "/jemaat/obrolan", label: "Obrolan Jemaat", icon: MessagesSquare },
  { href: "/jemaat/permohonan-surat", label: "Permohonan Surat", icon: FileText },
];

export default function JemaatLayout({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState("Jemaat");
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/jemaat")}`);
        return;
      }

      try {
        const roles = await resolveUserRoles(db, user);
        if (!(roles.length === 1 && roles[0] === "jemaat")) {
          router.replace("/admin");
          return;
        }

        const profile = await import("firebase/firestore").then(({ getDoc, doc }) => getDoc(doc(db, "users", user.uid)));
        const profileName = profile.exists() ? profile.data().nama : null;
        setUserName(typeof profileName === "string" && profileName.trim() ? profileName : user.email?.split("@")[0] || "Jemaat");
      } catch (error) {
        console.error("Gagal memeriksa akun jemaat:", error);
        router.replace("/login");
        return;
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch((error) => console.error("Gagal membersihkan sesi:", error));
    await signOut(auth);
    router.replace("/login");
  };

  if (isLoading) {
    return <LoadingScreen label="Memeriksa akses jemaat" />;
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-emerald-950">
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#fdfcf8]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <Link href="/jemaat" className="inline-flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-sm">
              <Image src="/icon.png" alt="GKJW" width={34} height={34} unoptimized className="h-8 w-8 object-contain" />
            </span>
            <span className="leading-tight">
              <strong className="block font-serif text-lg">GKJW Kucur</strong>
              <small className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/65">Portal Jemaat</small>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi portal jemaat">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? "bg-emerald-900 text-white" : "text-emerald-950/70 hover:bg-emerald-950/10"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block"><strong className="block text-sm">{userName}</strong><small className="text-xs text-emerald-950/55">Jemaat</small></span>
            <button type="button" onClick={handleLogout} className="hidden rounded-full border border-emerald-950/10 p-2 text-emerald-950/65 transition hover:bg-emerald-950 hover:text-white sm:block" aria-label="Keluar">
              <LogOut size={16} />
            </button>
            <button type="button" onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-full border border-emerald-950/10 p-2 text-emerald-950 md:hidden" aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}>
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && <nav className="border-t border-emerald-950/10 px-5 py-3 md:hidden">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-950/75"><item.icon size={17} />{item.label}</Link>)}<button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-rose-700"><LogOut size={17} />Keluar</button></nav>}
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
