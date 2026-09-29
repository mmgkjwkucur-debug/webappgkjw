"use client";
import { useState } from "react";
import { AuthErrorCodes, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { resolveUserRoles } from "@/lib/roles";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginEmail = identifier.trim();
      if (!loginEmail.includes("@")) {
        const usernameResponse = await fetch("/api/auth/resolve-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: loginEmail }),
        });
        const usernameBody = await usernameResponse.json().catch(() => ({}));
        if (!usernameResponse.ok || typeof usernameBody.email !== "string") {
          throw new Error(usernameBody.error || "Username atau password salah.");
        }
        loginEmail = usernameBody.email;
      }

      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, password);
      const idToken = await userCredential.user.getIdToken();

      const sessionResponse = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (!sessionResponse.ok) {
        const body = await sessionResponse.json().catch(() => ({}));
        throw new Error(body?.error || "Gagal membuat sesi login.");
      }

      const roles = await resolveUserRoles(db, userCredential.user);
      router.push(roles.length === 1 && roles[0] === "jemaat" ? "/jemaat" : "/admin");
    } catch (error) {
      console.error("Login failed", error);
      setError(error instanceof Error ? error.message : getAuthErrorMessage(error));
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen label="Menyiapkan ruang GKJW" />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f5ef] px-5 py-10 text-slate-900">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-3 text-emerald-950">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-lg shadow-emerald-950/10">
              <Image src="/icon.png" alt="GKJW" width={40} height={40} unoptimized className="h-10 w-10 object-contain" />
            </span>
            <span className="text-left">
              <strong className="block font-serif text-xl">GKJW Kucur</strong>
              <small className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/65">Patunggilan Kang Nyawiji</small>
            </span>
          </Link>
          <h1 className="mt-10 text-3xl font-bold tracking-tight text-emerald-950">Masuk ke GKJW Kucur</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Satu akses untuk jemaat, pengurus, dan pelayan gereja.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-8">

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
              type="text"
              name="identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Username atau email"
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
            Masuk
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}
