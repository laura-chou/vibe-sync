"use client";

import { useEffect, useState, useRef } from "react";

interface Message {
  type?: string;
  sender?: string;
  content: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws");
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (typeof data === "object" && data !== null && data.content) {
          setMessages((prev) => [
            ...prev,
            {
              type: data.type || "CHAT",
              sender: data.sender || "System/Player",
              content: data.content,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              content: event.data,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            content: event.data,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socketRef.current) return;

    const payload = JSON.stringify({
      type: "CHAT",
      sender: "Player",
      content: inputMessage,
    });

    socketRef.current.send(payload);
    setInputMessage("");
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700 flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">即時互動遊戲 WebSocket 測試</h1>
            <p className="text-xs text-slate-400">Next.js + FastAPI 連線測試</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {isConnected ? "已連線" : "未連線"}
            </span>
          </div>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/50">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 my-auto py-12">
              尚未收到任何訊息...
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg text-sm max-w-[80%] ${
                  msg.type === "SYSTEM"
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-200 mx-auto text-center w-full"
                    : "bg-slate-800 border border-slate-700 text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1 gap-4">
                  <span className="font-semibold text-slate-300">{msg.sender || "Message"}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="break-words">{msg.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={isConnected ? "輸入訊息以傳送給所有線上玩家..." : "等待連線中..."}
            disabled={!isConnected}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            傳送
          </button>
        </form>
      </div>
    </main>
  );
}
