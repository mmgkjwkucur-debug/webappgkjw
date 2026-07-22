"use client";
import { useState } from "react";
import { AuthErrorCodes, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

function getAuthErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;

    switch (code) {
      case AuthErrorCodes.INVALID_LOGIN_CREDENTIALS:
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Email atau password salah.";
      case AuthErrorCodes.INVALID_EMAIL:
      case "auth/invalid-email":
        return "Format email tidak valid.";
      case AuthErrorCodes.USER_DISABLED:
      case "auth/user-disabled":
        return "Akun ini dinonaktifkan.";
      case AuthErrorCodes.NETWORK_REQUEST_FAILED:
      case "auth/network-request-failed":
        return "Gangguan jaringan. Coba lagi.";
      case "auth/too-many-requests":
        return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
      case "auth/operation-not-allowed":
        return "Login email/password belum diaktifkan di Firebase.";
      default:
        return `Login gagal: ${code ?? "Silakan cek kembali data Anda."}`;
    }
  }

  return "Login gagal. Periksa kembali email dan password Anda.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin");
    } catch (error) {
      console.error("Login failed", error);
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-slate-50 text-slate-900 lg:grid-cols-[minmax(0,1fr)_460px]">
      <section className="flex min-h-72 items-end bg-[linear-gradient(130deg,rgba(15,23,42,0.9),rgba(79,70,229,0.82)),url('/login-bg.png')] bg-cover bg-center p-8 text-white lg:min-h-screen lg:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">GKJW Jemaat Kucur</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">CMS & Sistem Administrasi</h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-200">Integrasi penuh untuk administrasi internal dan pusat informasi digital GKJW Jemaat Kucur.</p>
        </div>
      </section>

      <section className="grid place-items-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Login CMS Gereja</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Masuk menggunakan akun admin yang sudah memiliki role di Firestore.</p>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-7 grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">Password</label>
            <input
              className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}
