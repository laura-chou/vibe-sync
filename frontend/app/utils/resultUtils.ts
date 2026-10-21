export interface ChemistryEvaluation {
  percentage: number;
  badge: string;
  title: string;
  comment: string;
}

export function evaluateChemistry(
  score: number,
  totalQuestions: number
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
