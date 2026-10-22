"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AVATARS = ["🦊", "🦝", "🦄", "🐨", "🐼", "🐔", "🐲", "🐯", "🐰", "🐻"];

export default function Home() {
  const router = useRouter();
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");

  const trimmedName = playerName.trim();
  const isNameValid = trimmedName.length > 0;

  // Generate 6-digit room code
  const handleCreateRoom = () => {
    if (!isNameValid) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    router.push(
      `/room/${code}?isHost=true&name=${encodeURIComponent(
        trimmedName
      )}&avatar=${encodeURIComponent(selectedAvatar)}`
    );
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid) return;
    if (roomCode.length !== 6 || !/^\d{6}$/.test(roomCode)) {
      setError("請輸入正確的 6 位數字房號");
      return;
    }
    router.push(
      `/room/${roomCode}?name=${encodeURIComponent(
        trimmedName
      )}&avatar=${encodeURIComponent(selectedAvatar)}`
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <img
            src="/android-chrome-192x192.png"
            alt="頻率同步中 Vibe Sync"
            className="w-16 h-16 rounded-2xl mb-2 object-cover border border-indigo-500/30 shadow-lg"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            頻率同步中 Vibe Sync
          </h1>
        </div>

        {/* Player Name Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">
            玩家暱稱 <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError("");
            }}
            placeholder="請輸入暱稱"
            maxLength={12}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {!isNameValid && (
            <p className="text-[11px] text-amber-400/90 font-medium">
              請先輸入玩家暱稱才能進行遊戲
            </p>
          )}
        </div>

        {/* Avatar Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            選擇玩家頭像
          </label>
          <div className="grid grid-cols-5 gap-2">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedAvatar(emoji)}
                className={`py-2 text-2xl rounded-xl border transition-all flex items-center justify-center ${
                  selectedAvatar === emoji
                    ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/50 scale-105"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Main Action Buttons */}
        {!showJoinInput ? (
          <div className="space-y-3.5">
            <button
              onClick={handleCreateRoom}
              disabled={!isNameValid}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-indigo-600 disabled:hover:to-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-600/20 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>🏠</span>
              <span>創建房間</span>
            </button>

            <button
              onClick={() => {
                if (!isNameValid) return;
                setShowJoinInput(true);
                setError("");
              }}
              disabled={!isNameValid}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-slate-800 text-slate-200 font-bold py-3.5 px-6 rounded-xl border border-slate-700 transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>加入房間</span>
            </button>
          </div>
        ) : (
          /* Join Room Form */
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300">
                  請輸入 6 位數房間代碼
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinInput(false);
                    setError("");
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ← 返回選單
                </button>
              </div>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setRoomCode(val);
                  setError("");
                }}
                placeholder="例如: 839210"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              {error && (
                <p className="text-xs text-rose-400 text-center font-medium">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isNameValid || roomCode.length !== 6}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all transform active:scale-[0.99]"
            >
              進入房間
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
