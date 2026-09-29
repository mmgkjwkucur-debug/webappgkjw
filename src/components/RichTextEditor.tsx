"use client";

import { useEffect, useRef } from "react";
import { AlignCenter, AlignLeft, Bold, Heading2, Heading3, Image as ImageIcon, Italic, Link2, List, ListOrdered, Quote, Redo2, RemoveFormatting, Underline, Undo2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
};

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
  }, [value]);

  function exec(command: string, valueArg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, valueArg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function promptForUrl(label: string, command: string) {
    const url = window.prompt(label);
    if (url?.trim()) exec(command, url.trim());
  }

  const toolbarButton = "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
          <button type="button" className={toolbarButton} onClick={() => exec("undo")} aria-label="Urungkan" title="Urungkan"><Undo2 size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("redo")} aria-label="Ulangi" title="Ulangi"><Redo2 size={16} /></button>
        </div>
        <div className="flex items-center gap-1 border-r border-slate-200 px-2">
          <button type="button" className={toolbarButton} onClick={() => exec("bold")} aria-label="Tebal" title="Tebal"><Bold size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("italic")} aria-label="Miring" title="Miring"><Italic size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("underline")} aria-label="Garis bawah" title="Garis bawah"><Underline size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("removeFormat")} aria-label="Hapus format" title="Hapus format"><RemoveFormatting size={16} /></button>
        </div>
        <div className="flex items-center gap-1 border-r border-slate-200 px-2">
          <button type="button" className={toolbarButton} onClick={() => exec("formatBlock", "H2")} aria-label="Heading 2" title="Heading 2"><Heading2 size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("formatBlock", "H3")} aria-label="Heading 3" title="Heading 3"><Heading3 size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("insertUnorderedList")} aria-label="Daftar bullet" title="Daftar bullet"><List size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("insertOrderedList")} aria-label="Daftar bernomor" title="Daftar bernomor"><ListOrdered size={16} /></button>
        </div>
        <div className="flex items-center gap-1 border-r border-slate-200 px-2">
          <button type="button" className={toolbarButton} onClick={() => exec("justifyLeft")} aria-label="Rata kiri" title="Rata kiri"><AlignLeft size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("justifyCenter")} aria-label="Rata tengah" title="Rata tengah"><AlignCenter size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => exec("formatBlock", "BLOCKQUOTE")} aria-label="Kutipan" title="Kutipan"><Quote size={16} /></button>
        </div>
        <div className="flex items-center gap-1 px-2">
          <button type="button" className={toolbarButton} onClick={() => promptForUrl("URL gambar:", "insertImage")} aria-label="Sisipkan gambar" title="Sisipkan gambar"><ImageIcon size={16} /></button>
          <button type="button" className={toolbarButton} onClick={() => promptForUrl("URL link:", "createLink")} aria-label="Sisipkan link" title="Sisipkan link"><Link2 size={16} /></button>
        </div>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        className="min-h-[220px] w-full bg-white px-4 py-4 text-sm leading-7 text-slate-800"
        data-placeholder={placeholder}
        style={{ outline: "none" }}
      />
    </div>
  );
}
