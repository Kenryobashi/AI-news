// Gemini Pro で読み上げ原稿を生成する

import { GoogleGenAI } from "@google/genai";
import type { WeatherSummary } from "./weather.js";
import type { NewsByCategory } from "./rss.js";

function formatDate(date: Date): string {
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export async function generateScript(
  weather: WeatherSummary,
  news: NewsByCategory,
  geminiApiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const today = formatDate(new Date());
  const steelNews = news.steel
    .map((n, i) => `${i + 1}. ${n.title}\n   ${n.description}`)
    .join("\n");

  const prompt = `あなたは朝の通勤ラジオ番組のパーソナリティです。
川平慈英さんのように、エネルギッシュでカッコよく、聴いている人が元気になれるスタイルで話してください。

以下の情報をもとに、車内で聴くための読み上げ原稿を作成してください。

【今日の日付】
${today}

【北九州市の天気】
今日: ${weather.today}（最低${weather.todayTemp.min}度 / 最高${weather.todayTemp.max}度、降水確率${weather.todayPop}%）
明日: ${weather.tomorrow}（最低${weather.tomorrowTemp.min}度 / 最高${weather.tomorrowTemp.max}度）

【鉄鋼業界ニュース】
${steelNews}

【原稿の条件】
- 合計6〜8分で読める長さ（約1800〜2400文字）
- 冒頭は元気な挨拶から始める（「おはようございます！」など）
- 天気コーナー → 鉄鋼ニュースコーナーの順番
- 各ニュースは要点を絞って読み上げ、「つまりこれって何を意味するか？」を一言添える
- 締めは「今日も最高の一日にしていきましょう！」的な締めくくり
- 読み上げ用なので記号（【】、◆、★など）は使わない
- 自然な話し言葉で書く

原稿のみ出力してください。`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text ?? "";
}
