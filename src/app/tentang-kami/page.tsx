import { Heart, Landmark, Sprout } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/PublicChrome";

const services = [
  ["Teologi", "Membangun kehidupan iman melalui ibadah, pemahaman Alkitab, katekisasi, dan pembinaan."],
  ["Persekutuan", "Merawat kebersamaan seluruh warga jemaat agar dapat bertumbuh bersama dalam Tuhan."],
  ["Kesaksian", "Menghadirkan kasih Kristus melalui perkataan, sikap, dan kehidupan di tengah masyarakat."],
  ["Cinta Kasih", "Mewujudkan kepedulian nyata, keadilan, perdamaian, dan perhatian kepada sesama."],
  ["Penatalayanan", "Mengembangkan talenta, sumber daya, dan sarana bagi pertumbuhan pelayanan gereja."],
];

export default function TentangKamiPage() {
  return (
    <main className="min-h-screen bg-[#f7f5ef] text-emerald-950">
      <PublicHeader />
      <section className="bg-emerald-950 px-5 py-20 text-white lg:py-28">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-300">Tentang Kami</p><h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.02] sm:text-7xl">Satu persekutuan, hadir untuk menjadi berkat.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-emerald-50/75">GKJW Jemaat Kucur bertumbuh dalam iman, menguatkan kebersamaan, dan melayani dengan kasih.</p></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]"><aside className="rounded-[2rem] bg-amber-200 p-8 text-emerald-950"><Landmark size={32} /><p className="mt-10 text-xs font-bold uppercase tracking-[0.24em]">Jejak Perjalanan</p><p className="mt-4 font-serif text-4xl">1968 — 2022</p><p className="mt-5 leading-7 text-emerald-950/70">Dari persekutuan sederhana hingga menjadi jemaat mandiri ke-176 di lingkungan GKJW.</p></aside><div className="rounded-[2rem] border border-emerald-950/10 bg-white p-8 sm:p-11"><p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-700">Selamat Datang</p><h2 className="mt-4 font-serif text-4xl leading-tight">GKJW Jemaat Kucur</h2><div className="mt-7 space-y-5 leading-8 text-emerald-950/70"><p>GKJW Jemaat Kucur adalah bagian dari Greja Kristen Jawi Wetan, sebuah persekutuan umat Tuhan yang hadir untuk bertumbuh dalam iman, membangun kebersamaan, melayani sesama, dan menjadi berkat di tengah masyarakat.</p><p>Dalam semangat <strong>“Patunggilan Kang Nyawiji”</strong>, kami percaya gereja adalah persekutuan yang hidup: tempat setiap warga dipanggil untuk mengambil bagian dalam pelayanan dan mewujudkan kasih Tuhan melalui kehidupan sehari-hari.</p><p>Perjalanan persekutuan di Kucur dimulai pada 1968. Setelah bertumbuh sebagai bagian dari GKJW Jemaat Sengkaling, pada 20 Februari 2022 GKJW Jemaat Kucur resmi didewasakan menjadi jemaat mandiri.</p></div></div></div>
      </section>
      <section className="border-y border-emerald-950/10 bg-[#fffdf7] px-5 py-16 lg:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Arah Pelayanan</p><h2 className="mt-4 font-serif text-4xl sm:text-5xl">Hidup dalam kasih, bersatu dalam pelayanan.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2"><article className="rounded-3xl bg-emerald-900 p-8 text-white"><Heart className="text-amber-300" /><h3 className="mt-7 font-serif text-3xl">Visi</h3><p className="mt-4 leading-8 text-emerald-50/75">Menjadi persekutuan yang bertumbuh dalam iman, hidup dalam kasih, bersatu dalam pelayanan, dan menjadi berkat bagi sesama.</p></article><article className="rounded-3xl border border-emerald-950/10 bg-white p-8"><Sprout className="text-emerald-700" /><h3 className="mt-7 font-serif text-3xl">Misi</h3><ul className="mt-4 space-y-3 text-sm leading-7 text-emerald-950/70"><li>Berakar pada firman Tuhan dan doa.</li><li>Mempererat persekutuan seluruh warga.</li><li>Menggerakkan setiap warga dalam pelayanan.</li><li>Menyatakan kasih Kristus kepada sesama.</li></ul></article></div></div></section>
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24"><p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Lima Bidang Pelayanan</p><h2 className="mt-4 max-w-2xl font-serif text-4xl sm:text-5xl">Bertumbuh bersama melalui karya yang nyata.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{services.map(([title, description], index) => <article key={title} className="rounded-3xl border border-emerald-950/10 bg-white p-7 shadow-sm"><span className="text-sm font-bold text-amber-700">0{index + 1}</span><h3 className="mt-8 font-serif text-2xl">{title}</h3><p className="mt-3 text-sm leading-7 text-emerald-950/65">{description}</p></article>)}</div></section>
      <PublicFooter />
    </main>
  );
}
