"use client";

import { useEffect, useRef } from "react";

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
    document.execCommand(command, false, valueArg);
    // notify change
    if (ref.current) onChange(ref.current.innerHTML);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("bold")}>B</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("italic")}>I</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("underline")}>U</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => {
          const url = prompt("URL gambar:"); if (url) exec("insertImage", url);
        }}>Img</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("justifyLeft")}>Left</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("justifyCenter")}>Center</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => exec("formatBlock", "H2")}>H2</button>
        <button type="button" className="px-2 py-1 rounded border" onClick={() => {
          const url = prompt("URL link:"); if (url) exec("createLink", url);
        }}>Link</button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => ref.current && onChange(ref.current.innerHTML)}
        className="min-h-[140px] w-full rounded-md border px-3 py-2 bg-white"
        data-placeholder={placeholder}
        style={{ outline: "none" }}
      />
    </div>
  );
}
