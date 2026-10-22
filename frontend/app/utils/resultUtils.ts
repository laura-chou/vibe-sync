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
  if (totalQuestions <= 0) {
    return {
      percentage: 0,
      badge: "🧊",
      title: "最熟悉的陌生人",
      comment: "建議重新認識一下！",
    };
  }

  const percentage = Math.round((score / totalQuestions) * 100);

  if (relationship === "couple") {
    if (percentage === 100) {
      return {
        percentage,
        badge: "💍",
        title: "天生一對",
        comment: "閃瞎眾人！你們根本是命中注定的完美伴侶！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "👩‍❤️‍👨",
        title: "熱戀甜蜜蜜",
        comment: "眼神拉絲、心有靈犀，甜度直接超標！",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "🛋️",
        title: "老夫老妻",
        comment: "感情穩定但偶爾有點小失誤，今晚罰抱抱一下！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "🛋️",
        title: "床頭吵床尾和",
        comment: "喜好不太一樣，需要靠滿滿的愛來包容對方囉！",
      };
    } else {
      return {
        percentage,
        badge: "🧯",
        title: "跪算盤預備",
        comment: "對方的心思完全沒猜中，快去買宵夜賠罪！",
      };
    }
  } else if (relationship === "family") {
    if (percentage === 100) {
      return {
        percentage,
        badge: "🏡",
        title: "血濃於水",
        comment: "一家人就是要這樣！彼此的習慣瞭如指掌！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "🍲",
        title: "溫馨一家親",
        comment: "家庭凝聚力滿分，餐桌上的話題總是很有共鳴！",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "🛋️",
        title: "日常同居人",
        comment: "基本生活習慣都很了解，偶爾關心一下近況會更好！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "📦",
        title: "家裡撿來的？",
        comment: "對方喜歡什麼都不太清楚，今晚晚餐多聊聊天吧！",
      };
    } else {
      return {
        percentage,
        badge: "❓",
        title: "抱錯小孩了嗎",
        comment: "完全不了解家人的喜好，快回客廳開家族會議！",
      };
    }
  } else {
    // Default: friends
    if (percentage === 100) {
      return {
        percentage,
        badge: "🏆",
        title: "靈魂伴侶",
        comment: "簡直是對方心裡的蛔蟲，默契值破表！",
      };
    } else if (percentage >= 75) {
      return {
        percentage,
        badge: "💖",
        title: "絕佳默契",
        comment: "眼神交流就能懂，感情好到不行！",
      };
    } else if (percentage >= 50) {
      return {
        percentage,
        badge: "🤝",
        title: "點頭之交",
        comment: "表現還不錯，再多了解一點會更好！",
      };
    } else if (percentage >= 25) {
      return {
        percentage,
        badge: "😅",
        title: "塑膠好友",
        comment: "默契有點感人，需要再多加油囉！",
      };
    } else {
      return {
        percentage,
        badge: "🧊",
        title: "最熟悉的陌生人",
        comment: "建議平時多關心對方，重新認識一下！",
      };
    }
  }
}
