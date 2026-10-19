# AGENTS.md - 開發與架構指引

本文件提供 AI Agent 與開發者開發此專案時的架構說明與規範。

## 前後端架構概觀

1. **後端 (`/backend`)**
   - 使用 Python FastAPI 提供 REST API 與 WebSocket 連線。
   - 進入點為 `backend/main.py`。
   - 使用 `uvicorn main:app --reload` 啟動開發伺服器。
   - 套件依賴管理於 `backend/requirements.txt`。

2. **前端 (`/frontend`)**
   - 使用 Next.js (App Router) + TypeScript + Tailwind CSS。
   - 進入點與頁面位於 `frontend/app/`。
   - 使用 `npm run dev` 啟動開發伺服器。
