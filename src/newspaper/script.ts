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

  const prompt = `あなたは九州在住の40代男性営業マン向け朝の通勤ラジオのパーソナリティです。
聴いている人は鉄鋼会社の営業マンで、毎朝30分の通勤中に車で聴いています。

以下のニュースをもとに、まるで親しい先輩が話しかけるような自然な口語で原稿を書いてください。

---
【今日の日付】
${today}

【北九州市の天気（北九州地方）】
今日: ${weather.today}（最低${weather.todayTemp.min}℃ / 最高${weather.todayTemp.max}℃、降水確率${weather.todayPop}%）
明日の見通し: ${weather.tomorrow}（最低${weather.tomorrowTemp.min}℃ / 最高${weather.tomorrowTemp.max}℃）

【今日の鉄鋼業界ニュース】
${steelNews}
---

【原稿の書き方ルール】
1. 冒頭：「おはようございます」から始め、今日の日付と曜日を自然に入れる
2. 天気コーナー（1〜2分）：数字をそのまま読むだけでなく「これ、営業の外回りには${Number(weather.todayTemp.max) >= 30 ? "きつい暑さです" : "ちょうどいい気候ですね"}」のように実感を添える
3. 鉄鋼ニュースコーナー（4〜5分）：
   - 各ニュースのタイトルをそのまま読まない。「〇〇という話が出ていまして」「〇〇なんですよ」のように会話調に崩す
   - ニュースの背景・意味を1〜2文で補足する（「これって要するに〜ということですよね」）
   - 営業視点のひとこと（「お客さんとの話題にできそうです」「見積もりに影響するかもしれません」など）を添える
4. 締め（30秒）：短く元気よく。今日も頑張れる一言で終わる
5. 禁止事項：
   - 「承知しました」「以下の通りです」などAIっぽい表現は絶対に使わない
   - 【】◆★などの記号は一切使わない
   - 箇条書きにしない。全部つながった話し言葉で書く
   - ニュースのURLは読まない

原稿のみ出力してください。説明や前置きは不要です。`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text ?? "";
}
