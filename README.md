# 雙人/多人即時互動遊戲專案骨架 (ws-quiz-game)

本專案為一個雙人/多人即時互動遊戲的專案骨架，採用前後端分離架構，透過 WebSocket 實現即時訊息雙向傳輸。

## 架構說明

### 後端 (`/backend`)
- **框架**: Python FastAPI
- **伺服器**: Uvicorn
- **即時通訊**: WebSockets
- **設定與環境變數**: Pydantic-settings, Python-dotenv

### 前端 (`/frontend`)
- **框架**: Next.js (App Router)
- **語言**: TypeScript
- **樣式**: Tailwind CSS
- **即時通訊**: 原生 WebSocket API

---

## 快速啟動指南

### 1. 後端啟動 (`/backend`)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

後端服務將於 `http://localhost:8000` 啟動，WebSocket 介面位於 `ws://localhost:8000/ws`。

### 2. 前端啟動 (`/frontend`)

```bash
cd frontend
npm install
npm run dev
```

前端服務將於 `http://localhost:3000` 啟動。
