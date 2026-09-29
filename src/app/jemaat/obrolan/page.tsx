"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { onValue, push, ref, remove, set, update } from "firebase/database";
import { ArrowLeft, Globe2, LockKeyhole, MessagesSquare, Plus, Search, Send, Users, X } from "lucide-react";
import { auth, rtdb } from "@/lib/firebase";

type ChatRoom = {
  id: string;
  name: string;
  description: string;
  type: "jemaat";
  isPublic: boolean;
  memberIds: Record<string, boolean>;
  createdBy: string;
};

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt?: number;
};

type JemaatMember = {
  uid: string;
  nama: string;
  email: string;
};

function formatTime(value?: ChatMessage["createdAt"]) {
  const date = value ? new Date(value) : null;
  return date ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(date) : "baru saja";
}

function canAccessRoom(room: ChatRoom, userId: string) {
  return room.isPublic || Boolean(room.memberIds?.[userId]);
}

export default function JemaatChatPage() {
  const [user, setUser] = useState(auth.currentUser);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showRoomListOnMobile, setShowRoomListOnMobile] = useState(true);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState<"all" | "public" | "private">("all");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [jemaatMembers, setJemaatMembers] = useState<JemaatMember[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return;
    return onValue(ref(rtdb, "chatRooms"), (snapshot) => {
      const nextRooms = Object.entries(snapshot.val() || {})
        .map(([id, value]) => ({ id, ...(value as Omit<ChatRoom, "id">) }))
        .filter((room) => canAccessRoom(room, user.uid))
        .sort((first, second) => first.name.localeCompare(second.name, "id"));
      setRooms(nextRooms);
      setSelectedRoomId((current) => current ?? nextRooms[0]?.id ?? null);
    }, (error) => console.error("Gagal memuat ruang obrolan:", error));
  }, [user]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
  const visibleRooms = useMemo(() => {
    const query = roomSearch.trim().toLocaleLowerCase("id");
    return rooms.filter((room) => {
      const matchesFilter = roomFilter === "all" || (roomFilter === "public" ? room.isPublic : !room.isPublic);
      const matchesSearch = !query || `${room.name} ${room.description || ""}`.toLocaleLowerCase("id").includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [rooms, roomFilter, roomSearch]);

  const openRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    setShowRoomListOnMobile(false);
  };

  useEffect(() => {
    if (!user || !selectedRoom || selectedRoom.createdBy !== user.uid || selectedRoom.isPublic) {
      return;
    }

    fetch(`/api/chat/members/list?roomId=${encodeURIComponent(selectedRoom.id)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Daftar jemaat tidak dapat dimuat.");
        setJemaatMembers(Array.isArray(body.members) ? body.members : []);
      })
      .catch((error) => {
        console.error("Gagal memuat daftar jemaat:", error);
        setErrorMessage("Daftar jemaat tidak dapat dimuat.");
      });
  }, [selectedRoom, user]);

  useEffect(() => {
    if (!selectedRoomId) {
      return;
    }
    return onValue(ref(rtdb, `chatRooms/${selectedRoomId}/messages`), (snapshot) => {
      const nextMessages = Object.entries(snapshot.val() || {})
        .map(([id, value]) => ({ id, ...(value as Omit<ChatMessage, "id">) }))
        .sort((first, second) => (first.createdAt || 0) - (second.createdAt || 0));
      setMessages(nextMessages);
      window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 0);
    }, (error) => console.error("Gagal memuat pesan:", error));
  }, [selectedRoomId]);

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !roomName.trim()) return;
    const roomRef = push(ref(rtdb, "chatRooms"));
    await set(roomRef, {
      name: roomName.trim(),
      description: roomDescription.trim(),
      type: "jemaat",
      memberIds: { [user.uid]: true },
      createdBy: user.uid,
      createdAt: Date.now(),
      isPublic: isPublicRoom,
    });
    setRoomName("");
    setRoomDescription("");
    setIsPublicRoom(false);
    setIsCreateOpen(false);
  };

  const addMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedRoom || selectedRoom.createdBy !== user.uid || !memberEmail.trim()) return;
    const response = await fetch("/api/chat/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: memberEmail.trim(), roomId: selectedRoom.id }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.uid !== "string") {
      setErrorMessage(result.error || "Akun anggota tidak ditemukan.");
      return;
    }
    await update(ref(rtdb, `chatRooms/${selectedRoom.id}`), { [`memberIds/${result.uid}`]: true });
    setMemberEmail("");
  };

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selectedRoomId || !draft.trim() || isSending) return;
    setIsSending(true);
    setErrorMessage("");
    try {
      const messageRef = push(ref(rtdb, `chatRooms/${selectedRoomId}/messages`));
      await set(messageRef, {
        senderId: user.uid,
        senderName: user.email?.split("@")[0] || "Jemaat",
        text: draft.trim(),
        createdAt: Date.now(),
      });
      setDraft("");
    } catch (error) {
      console.error("Gagal mengirim pesan:", error);
      setErrorMessage("Pesan tidak dapat dikirim. Pastikan Anda sudah login dan rules Realtime Database aktif.");
    } finally {
      setIsSending(false);
    }
  };

  const deleteRoom = async (room: ChatRoom) => {
    if (!user || room.createdBy !== user.uid || !window.confirm(`Hapus grup ${room.name} beserta seluruh pesannya?`)) return;
    setErrorMessage("");
    try {
      await remove(ref(rtdb, `chatRooms/${room.id}`));
      if (selectedRoomId === room.id) {
        setSelectedRoomId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Gagal menghapus ruang obrolan:", error);
      setErrorMessage("Grup tidak dapat dihapus. Hanya pembuat grup yang dapat menghapusnya.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-700">Persekutuan digital</p>
          <h1 className="mt-3 font-serif text-4xl">Ruang obrolan jemaat</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-950/60">Berbagi kabar, menguatkan, dan berkoordinasi dalam grup jemaat.</p>
        </div>
        <button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:bg-emerald-800">
          <Plus size={17} /> Buat grup
        </button>
      </div>
      {errorMessage && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}

      <div className="grid min-h-[34rem] overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-white shadow-sm lg:grid-cols-[19rem_1fr]">
        <aside className={`${showRoomListOnMobile ? "flex" : "hidden"} min-h-[34rem] flex-col border-b border-emerald-950/10 bg-[#fffdf7] p-4 lg:flex lg:border-b-0 lg:border-r`}>
          <div className="flex items-center justify-between px-2 py-2">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Daftar percakapan</p><h2 className="mt-1 font-serif text-xl">Grup jemaat <span className="font-sans text-sm text-emerald-950/45">({rooms.length})</span></h2></div>
            <MessagesSquare className="text-amber-600" size={21} />
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 py-2.5 text-emerald-950/45 focus-within:border-emerald-700">
            <Search size={16} aria-hidden="true" />
            <input value={roomSearch} onChange={(event) => setRoomSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-emerald-950 outline-none placeholder:text-emerald-950/40" placeholder="Cari nama grup" aria-label="Cari nama grup" />
          </label>
          <div className="mt-3 flex gap-2" aria-label="Filter grup">
            {([ ["all", "Semua"], ["public", "Terbuka"], ["private", "Privat"] ] as const).map(([filter, label]) => <button key={filter} type="button" onClick={() => setRoomFilter(filter)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${roomFilter === filter ? "bg-emerald-900 text-white" : "bg-emerald-950/5 text-emerald-950/65 hover:bg-emerald-950/10"}`}>{label}</button>)}
          </div>
          <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
            {visibleRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const memberCount = Object.keys(room.memberIds || {}).length;
              return <button key={room.id} type="button" onClick={() => openRoom(room.id)} aria-current={isSelected ? "true" : undefined} className={`w-full rounded-2xl border p-3.5 text-left transition ${isSelected ? "border-emerald-900 bg-emerald-900 text-white shadow-md shadow-emerald-950/10" : "border-transparent text-emerald-950 hover:border-emerald-950/10 hover:bg-white"}`}>
                <span className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${isSelected ? "bg-white/10 text-white" : "bg-emerald-950/5 text-emerald-800"}`}><Users size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{room.name}</span>
                    <span className={`mt-1 block line-clamp-2 text-xs leading-5 ${isSelected ? "text-white/70" : "text-emerald-950/55"}`}>{room.description || "Belum ada deskripsi grup."}</span>
                  </span>
                </span>
                <span className={`mt-3 flex items-center justify-between border-t pt-2.5 text-[11px] ${isSelected ? "border-white/15 text-white/75" : "border-emerald-950/5 text-emerald-950/50"}`}>
                  <span className="inline-flex items-center gap-1.5">{room.isPublic ? <Globe2 size={13} /> : <LockKeyhole size={13} />}{room.isPublic ? "Terbuka" : "Privat"}</span>
                  <span>{memberCount} anggota</span>
                </span>
              </button>;
            })}
            {rooms.length === 0 && <div className="rounded-2xl border border-dashed border-emerald-950/15 p-4 text-center"><Users className="mx-auto text-emerald-800/40" size={24} /><p className="mt-2 text-sm font-semibold text-emerald-950">Belum ada grup</p><p className="mt-1 text-xs leading-5 text-emerald-950/55">Buat grup untuk mulai percakapan dengan jemaat.</p></div>}
            {rooms.length > 0 && visibleRooms.length === 0 && <p className="rounded-2xl border border-dashed border-emerald-950/15 p-4 text-center text-xs leading-5 text-emerald-950/55">Tidak ada grup yang cocok. Coba kata kunci atau filter lain.</p>}
          </div>
        </aside>

        <div className={`${showRoomListOnMobile ? "hidden" : "flex"} min-h-[34rem] flex-col lg:flex`}>
          <header className="border-b border-emerald-950/10 px-4 py-4 sm:px-5">
            <div className="flex items-start gap-3">
              <button type="button" onClick={() => setShowRoomListOnMobile(true)} className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-950/10 text-emerald-900 lg:hidden" aria-label="Kembali ke daftar grup"><ArrowLeft size={18} /></button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-bold text-slate-950 sm:text-xl">{selectedRoom?.name || "Pilih grup"}</h2>{selectedRoom && <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${selectedRoom.isPublic ? "bg-sky-50 text-sky-800" : "bg-amber-50 text-amber-800"}`}>{selectedRoom.isPublic ? <Globe2 size={12} /> : <LockKeyhole size={12} />}{selectedRoom.isPublic ? "Terbuka" : "Privat"}</span>}</div>
                <p className="mt-1 text-xs text-slate-500">{selectedRoom?.description || (selectedRoom ? "Percakapan grup jemaat" : "Pilih grup dari daftar untuk melihat percakapan.")}</p>
              </div>
              {selectedRoom?.createdBy === user?.uid && <button type="button" onClick={() => { if (selectedRoom) void deleteRoom(selectedRoom); }} className="shrink-0 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50">Hapus</button>}
            </div>
            {selectedRoom?.createdBy === user?.uid && !selectedRoom?.isPublic && <form onSubmit={addMember} className="mt-4 flex flex-col gap-2 sm:flex-row"><input type="email" list="jemaat-members" required value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500" placeholder="Pilih atau ketik email jemaat" /><datalist id="jemaat-members">{jemaatMembers.map((member) => <option key={member.uid} value={member.email}>{member.nama}</option>)}</datalist><button type="submit" className="rounded-xl bg-emerald-900 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">Tambah anggota</button></form>}</header>
          <div className="flex-1 space-y-4 overflow-y-auto bg-[#f7f5ef] p-5">
            {messages.map((message) => {
              const isMine = message.senderId === user?.uid;
              return <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${isMine ? "rounded-br-md bg-emerald-900 text-white" : "rounded-bl-md bg-white text-emerald-950"}`}><div className={`mb-1 text-xs font-bold ${isMine ? "text-emerald-100/70" : "text-emerald-800/60"}`}>{isMine ? "Anda" : message.senderName} · {formatTime(message.createdAt)}</div><p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p></div></div>;
            })}
            {selectedRoom && messages.length === 0 && <div className="grid h-full place-items-center text-center text-sm text-emerald-950/50">Belum ada pesan.<br />Mulai percakapan di grup ini.</div>}
            {!selectedRoom && <div className="grid h-full place-items-center text-center text-sm text-emerald-950/50">Pilih grup untuk mulai membaca pesan.</div>}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-3 border-t border-emerald-950/10 bg-white p-4"><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!selectedRoom} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white" placeholder={selectedRoom ? "Tulis pesan untuk grup..." : "Pilih grup terlebih dahulu"} /><button type="submit" disabled={!selectedRoom || !draft.trim() || isSending} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-900 text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Kirim pesan"><Send size={17} /></button></form>
        </div>
      </div>

      {isCreateOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/60 p-5" onClick={() => setIsCreateOpen(false)}><form onSubmit={createRoom} onClick={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Grup baru</p><h2 className="mt-2 font-serif text-3xl">Buat ruang obrolan</h2></div><button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-full border border-slate-200 p-2" aria-label="Tutup"><X size={17} /></button></div><label className="mt-7 grid gap-2 text-sm font-semibold text-slate-700">Nama grup<input value={roomName} onChange={(event) => setRoomName(event.target.value)} required maxLength={80} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500" placeholder="Contoh: Komisi Pemuda" /></label><label className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">Deskripsi<span className="font-normal text-slate-500">Opsional</span><textarea value={roomDescription} onChange={(event) => setRoomDescription(event.target.value)} maxLength={320} rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-500" placeholder="Jelaskan tujuan grup ini" /></label><label className="mt-4 flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={isPublicRoom} onChange={(event) => setIsPublicRoom(event.target.checked)} className="h-4 w-4 accent-emerald-800" /> Izinkan semua jemaat masuk</label><p className="mt-2 text-xs leading-5 text-slate-500">Matikan pilihan ini agar hanya anggota yang Anda tambahkan yang dapat membaca dan mengirim pesan.</p><button type="submit" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-900 px-5 py-3 font-bold text-white hover:bg-emerald-800">Buat grup <Plus size={17} /></button></form></div>}
    </section>
  );
}
