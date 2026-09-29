import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, HeartHandshake } from "lucide-react";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#fdfcf8]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
        <Link href="/" className="group inline-flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lg shadow-emerald-950/20 transition group-hover:-rotate-3">
            <Image src="/icon.png" alt="GKJW" width={36} height={36} unoptimized className="h-9 w-9 object-contain" />
          </span>
          <span className="grid leading-tight">
            <strong className="font-serif text-lg tracking-tight text-emerald-950">GKJW Kucur</strong>
            <small className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/65">Patunggilan Kang Nyawiji</small>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          <Link href="/" className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950/75 transition hover:bg-emerald-950 hover:text-white">Beranda</Link>
          <Link href="/warta-jemaat" className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950/75 transition hover:bg-emerald-950 hover:text-white">Warta</Link>
          <Link href="/renungan-harian" className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950/75 transition hover:bg-emerald-950 hover:text-white">Renungan</Link>
          <Link href="/tentang-kami" className="rounded-full px-4 py-2 text-sm font-semibold text-emerald-950/75 transition hover:bg-emerald-950 hover:text-white">Tentang Kami</Link>
        </nav>

        <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-800">
          CMS <ArrowUpRight size={15} />
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-emerald-950/10 bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between lg:px-8">
        <div>
          <div className="flex items-center gap-2 text-amber-200"><HeartHandshake size={18} /><span className="text-sm font-bold uppercase tracking-[0.18em]">GKJW Jemaat Kucur</span></div>
          <p className="mt-3 max-w-md text-sm leading-6 text-emerald-100/70">Bertumbuh dalam iman, hidup dalam kasih, dan melayani bersama sebagai berkat bagi sesama.</p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-100/50">© {new Date().getFullYear()} GKJW Kucur</p>
      </div>
    </footer>
  );
}
