"use client";

import { useMemo, useState } from "react";
import { Bot, Copy, Download, Loader2, Sparkles } from "lucide-react";

const promptTemplates = [
  {
    label: "Format Notulen Formal GKJW",
    value:
      "Tolong format ulang notulen rapat ini menjadi notulen formal GKJW dengan struktur pembukaan, ringkasan keputusan, dan daftar tindak lanjut.",
  },
  {
    label: "Ringkas Tugas (Action Items)",
    value:
      "Ekstrak semua tugas, penanggung jawab, dan tenggat waktu dari teks rapat ini menjadi daftar tugas singkat.",
  },
  {
    label: "Draf Pengumuman Warta",
    value:
      "Buat draf pengumuman warta jemaat berdasarkan poin-poin berikut, dengan format resmi GKJW.",
  },
];

export function FormAsistenAI() {
  const [rawText, setRawText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(promptTemplates[0].value);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => rawText.trim().length > 0, [rawText]);

  const handleTemplateClick = (template: string) => {
    setSelectedTemplate(template);
    setRawText((prev) => (prev.trim() ? prev : template));
    setResponse(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      setError("Silakan masukkan teks notulen atau permintaan terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rawText, template: selectedTemplate }),
      });

      if (!res.ok) {
        throw new Error("Gagal memproses permintaan AI.");
      }

      const data = await res.json();
      setResponse(data.result ?? data.text ?? "Hasil AI tidak tersedia.");
    } catch (fetchError) {
      console.error(fetchError);
      setError("Terjadi kesalahan saat memproses AI. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(response);
  };

  const handleDownloadPdf = () => {
    if (!response) return;
    const blob = new Blob([response], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asisten-ai-gkjw.pdf";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-emerald-700" />
          <h2 className="text-xl font-semibold text-slate-950">Asisten AI Sekretariat GKJW</h2>
        </div>
        <p className="text-sm text-slate-500">
          Otomatisasi dokumen, notulensi, dan format warta jemaat sesuai tata laksana GKJW.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {promptTemplates.map((template) => (
          <button
            type="button"
            key={template.label}
            onClick={() => handleTemplateClick(template.value)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              selectedTemplate === template.value
                ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            {template.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="space-y-3">
          <span className="text-sm font-semibold text-slate-700">Masukkan teks mentah atau notulen</span>
          <textarea
            value={rawText}
            onChange={(event) => {
              setRawText(event.target.value);
              setError("");
            }}
            rows={9}
            className={`w-full rounded-3xl border px-4 py-4 text-sm leading-6 transition focus:outline-none ${
              error
                ? "border-red-400 bg-red-50 text-slate-900"
                : "border-slate-200 bg-slate-50 focus:border-emerald-300"
            }`}
            placeholder="Ketik atau tempel teks notulen, permohonan surat, atau catatan rapat di sini..."
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading || !canSubmit}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          Proses dengan Gemini AI
        </button>
      </form>

      {response ? (
        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">Hasil AI</h3>
              <p className="text-sm text-slate-500">Salinan hasil otomatis dari Asisten AI Sekretariat.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-emerald-50"
              >
                <Copy className="h-4 w-4" />
                Salin Teks
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-emerald-50"
              >
                <Download className="h-4 w-4" />
                Unduh PDF
              </button>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-800">
            <pre className="whitespace-pre-wrap break-words">{response}</pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
