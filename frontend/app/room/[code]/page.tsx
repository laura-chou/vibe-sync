"use client";

import { useState, use, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
  avatar: string;
}

function RoomLobbyContent({ paramsPromise }: { paramsPromise: Promise<{ code: string }> }) {
  const resolvedParams = use(paramsPromise);
  const roomCode = resolvedParams.code;

  const searchParams = useSearchParams();
  const router = useRouter();

  const isHostParam = searchParams.get("isHost") === "true";
  const currentUserName = searchParams.get("name") || "我 (玩家)";

  // UI state for local testing/preview
  const [isHostView, setIsHostView] = useState<boolean>(isHostParam);
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  // Mock player list
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "p1",
      name: isHostView ? currentUserName : "創房神手 (房主)",
      isHost: true,
      avatar: "👑",
    },
    {
      id: "p2",
      name: !isHostView ? currentUserName : "遊戲好手 A",
      isHost: false,
      avatar: "🦊",
    },
    {
      id: "p3",
      name: "幸運小熊 B",
      isHost: false,
      avatar: "🐻",
    },
  ]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMockPlayer = () => {
    const avatars = ["🐯", "🐼", "🐸", "🦁", "🐰", "🦄"];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    const newId = `p${players.length + 1}`;
    const newPlayer: Player = {
      id: newId,
      name: `新玩家 ${players.length + 1}`,
      isHost: false,
      avatar: randomAvatar,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  };

  const handleSelectTarget = (id: string) => {
    if (!isHostView) return;
    setTargetPlayerId(id === targetPlayerId ? null : id);
  };

  const handleStartGame = () => {
    if (!targetPlayerId) return;
    setGameStarted(true);
  };

  const targetPlayer = players.find((p) => p.id === targetPlayerId);

  return (
    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8 space-y-6">
      {/* Local Preview Switcher Toolbar */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">切換視角測試:</span>
          <button
            onClick={() => setIsHostView(true)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              isHostView
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            👑 房主視角
          </button>
          <button
            onClick={() => setIsHostView(false)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              !isHostView
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            🎮 玩家視角
          </button>
        </div>

        <button
          onClick={handleAddMockPlayer}
          className="text-indigo-400 hover:text-indigo-300 bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-800/50 px-2.5 py-1 rounded-lg transition-colors font-medium"
        >
          + 模擬新玩家加入
        </button>
      </div>

      {/* Room Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              遊戲房間號碼
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold">
              等待中
            </span>
          </div>
          <div className="text-3xl font-mono font-extrabold text-indigo-400 tracking-widest mt-0.5">
            {roomCode}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleCopyCode}
            className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>{copied ? "✓ 已複製" : "📋 複製房號"}</span>
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex-1 sm:flex-none bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold px-4 py-2.5 rounded-lg border border-rose-800/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <span>退出房間</span>
          </button>
        </div>
      </div>

      {/* Game Started Demo State */}
      {gameStarted ? (
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 rounded-xl border border-indigo-500/40 text-center space-y-4 animate-fadeIn">
          <div className="text-4xl">🚀</div>
          <h2 className="text-xl font-bold text-indigo-300">遊戲已成功開始！</h2>
          <p className="text-sm text-slate-300">
            本次目標人物：{" "}
            <span className="font-bold text-amber-400">
              {targetPlayer?.avatar} {targetPlayer?.name}
            </span>
          </p>
          <button
            onClick={() => setGameStarted(false)}
            className="text-xs text-slate-400 hover:text-slate-200 underline pt-2"
          >
            重置回到大廳
          </button>
        </div>
      ) : (
        /* Lobby Core Area */
        <div className="space-y-5">
          {/* Players List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span>👥 玩家列表</span>
                <span className="text-xs font-normal text-slate-500">
                  ({players.length} 人)
                </span>
              </h2>
              {isHostView && (
                <span className="text-xs text-amber-400/90 font-medium">
                  💡 點擊玩家設為目標人物
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map((player) => {
                const isSelected = targetPlayerId === player.id;
                return (
                  <div
                    key={player.id}
                    onClick={() => handleSelectTarget(player.id)}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isHostView
                        ? "cursor-pointer hover:border-indigo-500/60"
                        : ""
                    } ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10"
                        : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="text-2xl bg-slate-800 p-2 rounded-xl">
                      {player.avatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-200 truncate">
                          {player.name}
                        </span>
                        {player.isHost && (
                          <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            房主
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div className="text-[11px] font-bold text-amber-400 mt-0.5 flex items-center gap-1">
                          <span>🎯</span>
                          <span>本次目標人物</span>
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 text-xs font-bold flex items-center justify-center">
                        ✓
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Host / Normal Player Specific Interface */}
          {isHostView ? (
            /* HOST INTERFACE */
            <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  👑 房主控制台
                </span>
                <span className="text-xs text-slate-400">
                  {targetPlayer
                    ? `已選擇目標: ${targetPlayer.name}`
                    : "請從上方點選一人設定為目標"}
                </span>
              </div>

              <button
                onClick={handleStartGame}
                disabled={!targetPlayerId}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-base"
              >
                <span>🚀</span>
                <span>開始遊戲</span>
              </button>
            </div>
          ) : (
            /* NORMAL PLAYER INTERFACE */
            <div className="space-y-3 bg-slate-950/40 p-5 rounded-xl border border-slate-800 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 mb-1 animate-spin">
                ⏳
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">
                  等待房主開始遊戲...
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  房主正在挑選本次目標人物與設定遊戲中，請稍候！
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoomLobby({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-slate-400">載入大廳中...</div>}>
        <RoomLobbyContent paramsPromise={params} />
      </Suspense>
    </main>
  );
}
