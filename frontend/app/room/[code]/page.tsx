"use client";

import { useState, useEffect, useRef, use, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  is_host: boolean;
  avatar: string;
  score: number;
}

interface Question {
  id: number;
  text: string;
  option_a: string;
  option_b: string;
  total_questions: number;
  current_index: number;
}

interface RoomState {
  code: string;
  host_id: string;
  status: "waiting" | "playing" | "question_result" | "game_over";
  target_user_id: string | null;
  question_index: number;
  current_question: Question | null;
  players: Player[];
  answers: Record<string, string>;
  scores: Record<string, number>;
}

function RoomLobbyContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ code: string }>;
}) {
  const resolvedParams = use(paramsPromise);
  const roomCode = resolvedParams.code;

  const searchParams = useSearchParams();
  const router = useRouter();

  const isHostParam = searchParams.get("isHost") === "true";
  const currentUserName = searchParams.get("name") || "玩家";

  // WebSocket & State
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [lastQuestionResult, setLastQuestionResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setErrorMsg(null);

      // Automatically create or join room upon websocket connection
      if (isHostParam) {
        ws.send(
          JSON.stringify({
            type: "CREATE_ROOM",
            room_code: roomCode,
            player_name: currentUserName,
            avatar: "👑",
          })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "JOIN_ROOM",
            room_code: roomCode,
            player_name: currentUserName,
            avatar: "🦊",
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type;

        if (type === "ROOM_CREATED") {
          setPlayerId(data.player_id);
          setRoomState(data.room_state);
        } else if (type === "ROOM_JOINED") {
          setPlayerId(data.player_id);
          setRoomState(data.room_state);
        } else if (
          type === "PLAYER_JOINED" ||
          type === "TARGET_SELECTED" ||
          type === "PLAYER_LEFT"
        ) {
          setRoomState(data.room_state);
        } else if (type === "QUESTION_START") {
          setRoomState(data.room_state);
          setLastQuestionResult(null);
        } else if (type === "ANSWER_SUBMITTED") {
          setRoomState(data.room_state);
        } else if (type === "QUESTION_RESULT") {
          setRoomState(data.room_state);
          setLastQuestionResult(data);
        } else if (type === "GAME_OVER") {
          setRoomState(data.room_state);
          setLeaderboard(data.leaderboard);
        } else if (type === "ERROR") {
          setErrorMsg(data.message);
          setTimeout(() => setErrorMsg(null), 3000);
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomCode, isHostParam, currentUserName]);

  // Actions
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectTarget = (targetId: string) => {
    if (!socketRef.current || !roomState) return;
    if (roomState.host_id !== playerId) return;

    socketRef.current.send(
      JSON.stringify({
        type: "SELECT_TARGET",
        target_user_id: targetId,
      })
    );
  };

  const handleStartGame = () => {
    if (!socketRef.current) return;
    socketRef.current.send(
      JSON.stringify({
        type: "START_GAME",
      })
    );
  };

  const handleSubmitAnswer = (choice: "A" | "B") => {
    if (!socketRef.current) return;
    socketRef.current.send(
      JSON.stringify({
        type: "SUBMIT_ANSWER",
        choice: choice,
      })
    );
  };

  const isHost = roomState ? roomState.host_id === playerId : isHostParam;
  const targetPlayer = roomState?.players.find(
    (p) => p.id === roomState.target_user_id
  );
  const myAnswer = roomState?.answers[playerId || ""];
  const totalPlayers = roomState?.players.length || 0;
  const answeredCount = roomState ? Object.keys(roomState.answers).length : 0;

  return (
    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8 space-y-6">
      {/* Status & Connection Bar */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            }`}
          />
          <span className="text-slate-300 font-medium">
            {isConnected ? "即時 WebSocket 已連線" : "未連線 / 連線中..."}
          </span>
        </div>
        <span className="text-slate-400">
          身份:{" "}
          <strong className="text-indigo-400">
            {isHost ? "👑 房主" : "🎮 玩家"}
          </strong>
        </span>
      </div>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs text-center font-medium">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Room Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 uppercase font-semibold">
              房間號碼
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                roomState?.status === "playing"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              }`}
            >
              {roomState?.status === "playing" ? "遊戲作答中" : "大廳等待中"}
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
            <span>離開</span>
          </button>
        </div>
      </div>

      {/* STATE 1: LOBBY WAITING */}
      {roomState?.status === "waiting" && (
        <div className="space-y-5">
          {/* Players List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <span>👥 玩家列表</span>
                <span className="text-xs font-normal text-slate-500">
                  ({roomState.players.length} 人)
                </span>
              </h2>
              {isHost && (
                <span className="text-xs text-amber-400/90 font-medium">
                  💡 點擊玩家設為目標人物
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roomState.players.map((player) => {
                const isSelected = roomState.target_user_id === player.id;
                return (
                  <div
                    key={player.id}
                    onClick={() => handleSelectTarget(player.id)}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isHost ? "cursor-pointer hover:border-indigo-500/60" : ""
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
                        {player.is_host && (
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

          {/* Controls */}
          {isHost ? (
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
                disabled={!roomState.target_user_id}
                className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 text-base"
              >
                <span>🚀</span>
                <span>開始遊戲</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-950/40 p-5 rounded-xl border border-slate-800 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 mb-1 animate-spin">
                ⏳
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                等待房主開始遊戲...
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                房主正在挑選本次目標人物，請做好作答準備！
              </p>
            </div>
          )}
        </div>
      )}

      {/* STATE 2: PLAYING (QUIZ) */}
      {roomState?.status === "playing" && roomState.current_question && (
        <div className="space-y-6">
          {/* Question Header Progress */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              第 {roomState.current_question.current_index} /{" "}
              {roomState.current_question.total_questions} 題
            </span>
            <span className="text-xs text-slate-400">
              目標人物:{" "}
              <strong className="text-amber-400">
                {targetPlayer?.avatar} {targetPlayer?.name}
              </strong>
            </span>
          </div>

          {/* Question Stem */}
          <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
            <p className="text-lg sm:text-xl font-extrabold text-slate-100 leading-relaxed">
              {roomState.current_question.text}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3.5">
            <button
              onClick={() => handleSubmitAnswer("A")}
              disabled={!!myAnswer}
              className={`p-4 rounded-xl border text-left font-bold transition-all flex items-center justify-between ${
                myAnswer === "A"
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/50"
                  : myAnswer
                  ? "bg-slate-950/40 border-slate-800/60 text-slate-500 cursor-not-allowed"
                  : "bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-indigo-500 text-slate-200 active:scale-[0.99]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-black flex items-center justify-center">
                  A
                </span>
                <span className="text-sm sm:text-base">
                  {roomState.current_question.option_a}
                </span>
              </div>
              {myAnswer === "A" && (
                <span className="text-xs text-indigo-400 font-bold">
                  已選擇 ✓
                </span>
              )}
            </button>

            <button
              onClick={() => handleSubmitAnswer("B")}
              disabled={!!myAnswer}
              className={`p-4 rounded-xl border text-left font-bold transition-all flex items-center justify-between ${
                myAnswer === "B"
                  ? "bg-indigo-600/30 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/50"
                  : myAnswer
                  ? "bg-slate-950/40 border-slate-800/60 text-slate-500 cursor-not-allowed"
                  : "bg-slate-950 hover:bg-slate-800 border-slate-800 hover:border-indigo-500 text-slate-200 active:scale-[0.99]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 font-mono font-black flex items-center justify-center">
                  B
                </span>
                <span className="text-sm sm:text-base">
                  {roomState.current_question.option_b}
                </span>
              </div>
              {myAnswer === "B" && (
                <span className="text-xs text-purple-400 font-bold">
                  已選擇 ✓
                </span>
              )}
            </button>
          </div>

          {/* Submission Status Footer */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {myAnswer ? "已完成提交，請等待其他人..." : "請點擊上方選項完成作答"}
            </span>
            <span className="font-mono text-indigo-400 font-bold">
              作答進度: {answeredCount} / {totalPlayers}
            </span>
          </div>
        </div>
      )}

      {/* STATE 3: QUESTION RESULT */}
      {roomState?.status === "question_result" && lastQuestionResult && (
        <div className="space-y-5 animate-fadeIn">
          <div className="bg-slate-950 p-5 rounded-2xl border border-amber-500/30 text-center space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase">
              本題結算公佈
            </div>
            <h3 className="text-base font-bold text-slate-200">
              目標人物{" "}
              <span className="text-amber-400">
                {lastQuestionResult.target_user_name}
              </span>{" "}
              選擇的正解為：
            </h3>
            <div className="inline-block bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 px-6 py-3 rounded-xl text-xl font-extrabold text-amber-300">
              選項 {lastQuestionResult.correct_choice}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400">玩家作答比對：</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lastQuestionResult.results.map((res: any) => (
                <div
                  key={res.player_id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-200">
                    {res.player_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">
                      選擇: {res.answer || "未作答"}
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        res.is_correct
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {res.is_correct ? "猜對 +1" : "猜錯"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: GAME OVER (LEADERBOARD) */}
      {roomState?.status === "game_over" && (
        <div className="space-y-6 text-center animate-fadeIn">
          <div className="space-y-2">
            <div className="text-4xl">🏆</div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-amber-300 via-indigo-300 to-pink-300 bg-clip-text text-transparent">
              遊戲結束！最終排行榜
            </h2>
          </div>

          <div className="space-y-2.5">
            {leaderboard.map((item: any, rank: number) => (
              <div
                key={item.player_id}
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  rank === 0
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-lg shadow-amber-500/5"
                    : "bg-slate-950 border-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 font-extrabold text-sm text-slate-400">
                    #{rank + 1}
                  </span>
                  <span className="text-2xl">{item.avatar}</span>
                  <span className="font-bold text-sm">{item.name}</span>
                </div>
                <span className="font-mono font-black text-lg text-indigo-400">
                  {item.score} 分
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-6 rounded-xl border border-slate-700 transition-colors"
          >
            返回首頁 / 重新開局
          </button>
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
