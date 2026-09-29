"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, query, orderBy, limit, getDoc, getDocs, doc, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Jadwal = { id: string; nama: string; tanggal: Date };

type AbsensiRecord = { id: string; nama_jemaat?: string; waktu_hadir?: any };

function parseFirestoreDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "toDate" in value && typeof (value as any).toDate === "function") {
    return (value as any).toDate();
  }
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ScannerPage() {
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [selectedJadwal, setSelectedJadwal] = useState<string | null>(null);
  const [recent, setRecent] = useState<AbsensiRecord[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [scannerStatus, setScannerStatus] = useState<"loading" | "ready" | "error" | "disabled">("loading");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanDebug, setScanDebug] = useState<string | null>(null);
  const html5QrRef = useRef<any>(null);
  const noCodeFoundCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const onResize = () => {
        if (html5QrRef.current) {
          void html5QrRef.current.stop();
          void html5QrRef.current.clear();
          void html5QrRef.current.start();
        }
      };
      window.addEventListener("orientationchange", onResize);
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("orientationchange", onResize);
        window.removeEventListener("resize", onResize);
      };
    }
  }, []);

  const selectedSchedule = useMemo(
    () => jadwalList.find((item) => item.id === selectedJadwal) ?? null,
    [jadwalList, selectedJadwal],
  );

  useEffect(() => {
    const q = query(collection(db, "jadwal_ibadah"), orderBy("tanggal", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs
        .map((d): Jadwal | null => {
          const data = d.data() as any;
          const tanggalValue = parseFirestoreDate(data.tanggal);
          if (!tanggalValue) return null;
          return { id: d.id, nama: data.nama || data.jenis || "Ibadah", tanggal: tanggalValue };
        })
        .filter((item): item is Jadwal => item !== null);
      setJadwalList(items);
      if (!selectedJadwal && items.length > 0) setSelectedJadwal(items[0].id);
    });

    return () => unsub();
  }, [selectedJadwal]);

  useEffect(() => {
    if (!selectedJadwal) {
      setRecent([]);
      return;
    }

    setRecent([]);
    const attendanceQuery = query(
      collection(db, "absensi_ibadah"),
      where("id_jadwal", "==", selectedJadwal),
      orderBy("waktu_hadir", "desc"),
      limit(10),
    );
    const unsub = onSnapshot(
      attendanceQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((item): item is AbsensiRecord => Boolean(item));
        setRecent(list);
      },
      (error) => {
        console.error("Absensi snapshot error:", error);
        setRecent([]);
        setScanDebug("Gagal memuat log hadir. Tunggu sampai index Firestore selesai dibangun.");
      },
    );

    return () => unsub();
  }, [selectedJadwal]);

  useEffect(() => {
    if (!selectedJadwal) {
      setScannerStatus("disabled");
      return;
    }

    let isUnmounted = false;

    const stopScanner = async () => {
      if (!html5QrRef.current) return;
      try {
        await html5QrRef.current.stop();
      } catch (error) {
        // ignore stop errors
      }
      try {
        await html5QrRef.current.clear();
      } catch (error) {
        // ignore clear errors
      }
      html5QrRef.current = null;
    };

    const startScanner = async (overrideQrbox?: number) => {
      setScannerStatus("loading");
      setScannerError(null);
      setScanDebug("Menyiapkan kamera... Pastikan izin kamera diberikan.");

      await stopScanner();

      try {
        const mod = await import("html5-qrcode");
        const Html5Qrcode = mod.Html5Qrcode;
        const html5Qrcode = new Html5Qrcode("qr-reader", {
          verbose: false,
          formatsToSupport: [mod.Html5QrcodeSupportedFormats.QR_CODE],
        });
        html5QrRef.current = html5Qrcode;

        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw new Error("Tidak ditemukan kamera yang tersedia.");
        }

        const rearCamera = cameras.find((camera) => /back|rear|environment/i.test(camera.label || ""));
        const cameraId = rearCamera?.id || cameras[0].id;
        setScanDebug(`Kamera ditemukan: ${rearCamera?.label || cameras[0].label || cameraId}. Mencari QR...`);

        const viewportW = Math.min(window.innerWidth || 360, window.innerHeight || 640, 560);
        const qrbox = overrideQrbox ?? Math.floor(Math.min(320, viewportW * 0.75));

        await html5Qrcode.start(
          cameraId,
          {
            fps: 15,
            qrbox,
            aspectRatio: 1.333,
            disableFlip: false,
            videoConstraints: { facingMode: { ideal: "environment" } },
          },
          async (decodedText: string) => {
            noCodeFoundCountRef.current = 0;
            setLastScan(decodedText);
            setScanDebug(`QR scan diterima: ${decodedText}`);

            try {
              html5Qrcode.pause(true);
            } catch (pauseError) {
              // ignore pause errors
            }

            const docSnap = await getDoc(doc(db, "data_induk", decodedText));
            if (!docSnap.exists()) {
              setMessage({ type: "error", text: "ID jemaat tidak ditemukan." });
              setScanDebug(`ID jemaat tidak ditemukan untuk kode: ${decodedText}`);
              setTimeout(() => setMessage(null), 2000);
              try {
                html5Qrcode.resume();
              } catch (resumeError) {
                // ignore
              }
              return;
            }

            const jemaat = docSnap.data() as any;
            setScanDebug(`ID jemaat ditemukan: ${decodedText} (${jemaat.nama ?? "nama tidak tersedia"})`);

            try {
              if (selectedJadwal) {
                const recentQuery = query(
                  collection(db, "absensi_ibadah"),
                  where("id_jadwal", "==", selectedJadwal),
                  where("id_jemaat", "==", decodedText),
                  orderBy("waktu_hadir", "desc"),
                  limit(1),
                );
                const recentSnap = await getDocs(recentQuery);
                if (!recentSnap.empty) {
                  const last = recentSnap.docs[0].data() as any;
                  if (last.waktu_hadir && last.waktu_hadir.seconds) {
                    const lastDate = new Date(last.waktu_hadir.seconds * 1000);
                    const now = new Date();
                    if (
                      lastDate.getFullYear() === now.getFullYear() &&
                      lastDate.getMonth() === now.getMonth() &&
                      lastDate.getDate() === now.getDate()
                    ) {
                      setMessage({ type: "error", text: `Sudah absen hari ini: ${jemaat.nama || "-"}` });
                      setTimeout(() => setMessage(null), 2000);
                      try {
                        html5Qrcode.resume();
                      } catch (resumeError) {
                        // ignore
                      }
                      return;
                    }
                  }
                }
              }

              await addDoc(collection(db, "absensi_ibadah"), {
                id_jadwal: selectedJadwal,
                id_jemaat: decodedText,
                nama_jemaat: jemaat.nama || null,
                waktu_hadir: serverTimestamp(),
              });

              setMessage({ type: "success", text: `Selamat Datang, ${jemaat.nama || "Tamu"}!` });
              setTimeout(() => setMessage(null), 2000);
            } catch (err) {
              console.error("Gagal menyimpan absensi:", err);
              setMessage({ type: "error", text: "Gagal menyimpan absensi." });
              setScanDebug(`Gagal menyimpan absensi: ${(err as Error)?.message ?? JSON.stringify(err)}`);
              setTimeout(() => setMessage(null), 2000);
            }

            setTimeout(() => {
              try {
                html5Qrcode.resume();
              } catch (resumeError) {
                // ignore
              }
            }, 800);
          },
          (errorMessage: string, error: any) => {
            if (error?.type === 2) {
              noCodeFoundCountRef.current += 1;
              if (noCodeFoundCountRef.current % 15 === 0) {
                setScanDebug(
                  `Masih mencari QR... Pastikan QR berada di tengah layar, cukup jelas, dan tidak terlalu jauh dari kamera. (${noCodeFoundCountRef.current} frame tanpa kode)`,
                );
              }
              return;
            }

            setScanDebug(`Scanner error: ${errorMessage}`);
          },
        );

        if (!isUnmounted) {
          setScannerStatus("ready");
        }
      } catch (err) {
        console.error("Init scanner failed:", err);
        if (!isUnmounted) {
          setScannerStatus("error");
          setScannerError(
            err instanceof Error
              ? `Gagal memulai kamera: ${err.message}. Pastikan izin kamera diberikan dan perangkat mendukung kamera.`
              : "Gagal memulai kamera. Pastikan izin kamera sudah diberikan dan perangkat mendukung kamera.",
          );
          setScanDebug(`Scanner init error: ${(err as Error)?.message ?? JSON.stringify(err)}`);
        }
      }
    };

    const restartScanner = async () => {
      await stopScanner();
      await startScanner();
    };

    const onResize = () => {
      void restartScanner();
    };

    window.addEventListener("orientationchange", onResize);
    window.addEventListener("resize", onResize);

    void startScanner();

    return () => {
      isUnmounted = true;
      window.removeEventListener("orientationchange", onResize);
      window.removeEventListener("resize", onResize);
      void stopScanner();
    };
  }, [selectedJadwal]);

  return (
    <div className="space-y-6 px-4 pb-8 sm:px-6 lg:px-0">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-3 sm:flex sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">Scanner Presensi Ibadah</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Absensi via QR Code</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Pilih Ibadah</label>
              <select
                value={selectedJadwal ?? ""}
                onChange={(e) => setSelectedJadwal(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                {jadwalList.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama ?? j.id} — {j.tanggal ? formatDateTime(j.tanggal) : "Tanggal belum tersedia"}
                  </option>
                ))}
              </select>
            </div>

            {selectedSchedule ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{selectedSchedule.nama}</p>
                <p>{formatDateTime(selectedSchedule.tanggal)}</p>
              </div>
            ) : null}

            <div className="relative rounded-xl border border-slate-200 bg-black/5 p-4">
              <div className="mb-3 flex flex-col gap-2 rounded-2xl bg-slate-950/5 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <span>{scannerStatus === "loading" ? "Menyiapkan kamera..." : scannerStatus === "ready" ? "Kamera siap" : scannerStatus === "error" ? "Kamera gagal" : "Pilih jadwal dulu"}</span>
                {scannerError ? <span className="text-rose-600">{scannerError}</span> : null}
              </div>
              <div className="mx-auto mb-3 rounded-3xl border border-emerald-300/60 bg-slate-950/10 p-2 text-sm text-slate-600">
                Arahkan QR ke kamera dan pusatkan QR di dalam area tampilan.
              </div>
              <div className="relative mx-auto w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950" style={{ aspectRatio: "1 / 1", minHeight: 280, maxWidth: 560 }}>
                <div
                  id="qr-reader"
                  className="absolute inset-0 rounded-3xl overflow-hidden"
                />
                <div className="pointer-events-none absolute inset-0 rounded-3xl">
                  <div className="absolute inset-[10%] rounded-[2rem] border border-white/20" />
                  <div className="absolute left-4 top-4 h-10 w-10 border-t-2 border-l-2 border-white" />
                  <div className="absolute right-4 top-4 h-10 w-10 border-t-2 border-r-2 border-white" />
                  <div className="absolute left-4 bottom-4 h-10 w-10 border-b-2 border-l-2 border-white" />
                  <div className="absolute right-4 bottom-4 h-10 w-10 border-b-2 border-r-2 border-white" />
                </div>
                {scannerStatus !== "ready" ? (
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-slate-950/30" />
                ) : null}
              </div>
            </div>

            {message ? (
              <div className={`mt-4 rounded-2xl p-3 text-sm font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{message.text}</div>
            ) : null}

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-slate-900">Debug Scanner</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Debug</span>
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div>
                  <span className="font-medium text-slate-900">Status:</span> {scannerStatus}
                </div>
                <div>
                  <span className="font-medium text-slate-900">Last scan:</span> {lastScan ?? "Belum ada pemindaian"}
                </div>
                <div className="whitespace-pre-wrap text-slate-600">{scanDebug ?? "Menunggu data QR..."}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Log Kehadiran Terakhir</h3>
              <div className="mt-3 space-y-3">
                {recent.length === 0 ? (
                  <div className="text-sm text-slate-500">Belum ada absensi.</div>
                ) : (
                  recent.map((r: any) => (
                    <div key={r.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{r.nama_jemaat ?? "-"}</div>
                          <div className="text-xs text-slate-500">{r.waktu_hadir ? formatDateTime(new Date(r.waktu_hadir.seconds * 1000)) : "-"}</div>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">Berhasil</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
