# Vibe Sync

這是一個即時多人默契問答的網頁遊戲。玩家們透過即時連線進入房間，由一位玩家擔任「主頻率」，其他人則透過猜測主頻率的選擇來測試彼此的默契指數！

### 核心功能

* **即時雙向互動**：基於 WebSocket 架構，支援多人即時加入、房號同步與答題狀態更新。
        <details>
        <summary>🔍 查看遊戲大廳畫面</summary>
        <br>
        <img src="./assets/lobby.jpg" alt="遊戲大廳與個性化設定" width="50%">
        </details>

* **多元關係模式**：支援「好友 (🍻)」、「新朋友 (🆕)」與「家人 (❤️)」三種關係類型設定。
        <details>
            <summary>🔍 查看房間等待畫面</summary>
            <br>
        <img src="./assets/room.jpg" alt="即時房態與多元關係模式" width="50%">
        </details>

* **結果分析**：提供深度同頻分析與排行榜數據，視覺化呈現玩家之間的默契指數、答題亮點及全場作答分布。
        <details>
        <summary>🔍 查看同頻分析畫面</summary>
        <br>
        <img src="./assets/result.jpg" alt="深度同頻分析頁面" width="50%">
        </details>

### 系統流程圖

```mermaid
sequenceDiagram
    autonumber
    participant Client as 前端 (Next.js)
    participant Server as 後端 (Server)

    Note over Client,Server: 1. 連線與房間初始化 (頁面載入即連線)
    Client->>Server: 建立 WebSocket 連線 (new WebSocket)
    Client->>Server: ws.send: CREATE_ROOM 或 JOIN_ROOM
    Server-->>Client: 回傳初始化房態 (包含 Player ID)
    
    Note over Client,Server: 2. 遊戲開始
    Client->>Server: ws.send: START_GAME (房主點擊開始)
    Server-->>Client: 廣播: QUESTION_START (派發題目與選項)

    Note over Client,Server: 3. 核心答題循環
    Client->>Server: ws.send: SUBMIT_ANSWER (送出選擇)
    Note over Server: 當所有人答完
    Server-->>Client: 廣播: QUESTION_RESULT (公佈正解與下題)

    Note over Client,Server: 4. 異常處理與防護機制 (玩家中途離線)
    alt 一般玩家離開 (剩餘人數 >= 2)
        Server-->>Client: 廣播: PLAYER_LEFT (更新剩餘玩家名單與分數)
    else 觸發熔斷 (主頻率離開 OR 剩餘人數 < 2)
        Server-->>Client: 廣播: GAME_ABORTED (重置房間為 waiting，退回大廳)
    end
    
    Note over Client,Server: 5. 遊戲結束
    Server-->>Client: 廣播: GAME_OVER (最終排行榜與分析)
```
