"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Download, X } from "lucide-react";

type UpdateManifest = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  notes?: string;
};

export default function ApkUpdateNotice() {
  const [update, setUpdate] = useState<UpdateManifest | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let active = true;
    let checking = false;
    let resumeListener: Awaited<ReturnType<typeof App.addListener>> | undefined;

    const checkForUpdate = async () => {
      if (checking) return;
      checking = true;

      try {
        const [appInfo, response] = await Promise.all([
          App.getInfo(),
          fetch(`/apk-update.json?t=${Date.now()}`, { cache: "no-store" }),
        ]);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const manifest = await response.json() as UpdateManifest;
        const versionCode = Number(manifest.versionCode);
        const installedVersionCode = Number(appInfo.build);
        const apkUrl = new URL(manifest.apkUrl);

        if (
          active
          && Number.isInteger(versionCode)
          && versionCode > installedVersionCode
          && typeof manifest.versionName === "string"
          && apkUrl.protocol === "https:"
        ) {
          setUpdate({ ...manifest, apkUrl: apkUrl.toString() });
        }
      } catch (error) {
        console.warn("Pengecekan update APK gagal:", error);
      } finally {
        checking = false;
      }
    };

    void checkForUpdate();
    void App.addListener("resume", checkForUpdate).then((listener) => {
      if (active) resumeListener = listener;
      else void listener.remove();
    });

    return () => {
      active = false;
      void resumeListener?.remove();
    };
  }, []);

  if (!update || dismissed) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-emerald-950/20" role="status">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-900 text-white"><Download size={18} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div><p className="font-bold text-emerald-950">Update tersedia</p><p className="mt-1 text-sm text-slate-600">Versi {update.versionName} sudah tersedia.</p></div>
            <button type="button" onClick={() => setDismissed(true)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup notifikasi update"><X size={17} /></button>
          </div>
          {update.notes && <p className="mt-2 text-xs text-slate-500">{update.notes}</p>}
          <button type="button" onClick={() => void Browser.open({ url: update.apkUrl })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"><Download size={15} /> Unduh update</button>
        </div>
      </div>
    </aside>
  );
}
