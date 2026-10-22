export interface ChemistryEvaluation {
  percentage: number;
  badge: string;
  title: string;
  comment: string;
}

export function evaluateChemistry(
  score: number,
  totalQuestions: number,
  relationship: string = "friends"
): ChemistryEvaluation {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  if (relationship === "new_friends") {
    if (percentage === 100) {
      return {
        percentage,
        badge: "🔮",
        title: "通靈系大師",
        comment: "才剛認識就能全猜對？老實說，你是不是偷偷調查過他身家！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "👀",
        title: "觀察力達人",
        comment: "才見面幾次就能抓到頻率，社交能力強到有點可怕喔！",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "✨",
        title: "直覺系盲猜",
        comment: "靠著面相跟強大直覺猜中不少，運氣也是實力的一種！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "🌀",
        title: "頻率大打結",
        comment: "腦波完全不在同一條線上，互相猜測像是在開通靈大會。",
      };
    } else {
      return {
        percentage,
        badge: "🌪️",
        title: "純靠瞎掰",
        comment: "完全猜不透！你們今天是不是路過被抓來湊數的？",
      };
    }
  } else if (relationship === "family") {
    if (percentage === 100) {
      return {
        percentage,
        badge: "🏡",
        title: "血濃於水",
        comment: "不愧是一家人，連冰箱裡剩什麼都能精準掌握！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "🏆",
        title: "同屋簷的神隊友",
        comment: "平常在家互動很溫馨，對彼此的生活習慣瞭如指掌。",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "🛋️",
        title: "平行時空家人",
        comment: "雖然住在同一個屋簷下，但平時各自滑手機過得很獨立喔！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "📦",
        title: "隔壁鄰居都比你熟",
        comment: "這題連隔壁鄰居都比你清楚，今晚多回家跟家人聊天吃飯吧！",
      };
    } else {
      return {
        percentage,
        badge: "❓",
        title: "家裡撿來的吧",
        comment: "完全不了解家人的喜好，快點開個家族會議重新認識！",
      };
    }
  } else {
    // Default / "friends"
    if (percentage === 100) {
      return {
        percentage,
        badge: "🔮",
        title: "心電感應大師",
        comment: "簡直直接複製了對方的腦波，連晚餐要吃啥都能神預測！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "💖",
        title: "靈魂合拍達人",
        comment: "眼神交流就能秒懂彼此，默契好到不行。",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "🤝",
        title: "普通酒肉朋友",
        comment: "平時約喝酒吃宵夜很行，心事倒是完全沒在關心對方！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "😅",
        title: "塑膠友情認證",
        comment: "這默契感人肺腑，你們平時其實只是在點讚交友吧？",
      };
    } else {
      return {
        percentage,
        badge: "🧊",
        title: "最熟悉的陌生人",
        comment: "建議原地絕交，路人都比你還了解他！",
      };
    }
  }
}
