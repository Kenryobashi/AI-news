// Gemini Pro で読み上げ原稿を生成する

import { GoogleGenAI } from "@google/genai";
import type { WeatherSummary } from "./weather.js";
import type { NewsByCategory } from "./rss.js";
import type { MarketData } from "./markets.js";
import type { SportsData } from "./sports.js";

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
  markets: MarketData,
  sports: SportsData,
  geminiApiKey: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const today = formatDate(new Date());
  const steelNews = news.steel
    .map((n, i) => `${i + 1}. ${n.title}\n   ${n.description}`)
    .join("\n");

  const aiDxNews = news.aiDx
    .map((n, i) => `${i + 1}. ${n.title}\n   ${n.description}`)
    .join("\n") || "本日は注目ニュースなし";

  const realestateNews = news.realestate
    .map((n, i) => `${i + 1}. ${n.title}\n   ${n.description}`)
    .join("\n") || "本日は注目ニュースなし";

  const sportsNews = [
    ...sports.baseball.map((s) => `野球（${s.team}）: ${s.title} ${s.description}`),
    ...sports.soccer.map((s) => `サッカー（${s.team}）: ${s.title} ${s.description}`),
    ...sports.basketball.map((s) => `バスケ（${s.team}）: ${s.title} ${s.description}`),
  ].join("\n") || "昨日は試合なし";

  const prompt = `あなたは九州在住の40代男性営業マン向け朝の通勤ラジオのパーソナリティです。
聴いている人は鉄鋼会社の営業マンで、毎朝30分の通勤中に車で聴いています。

以下のデータをもとに、まるで親しい先輩が話しかけるような自然な口語で原稿を書いてください。

---
【今日の日付】
${today}

【北九州市の天気（北九州地方）】
今日: ${weather.today}（最低${weather.todayTemp.min}℃ / 最高${weather.todayTemp.max}℃、降水確率${weather.todayPop}%）
明日の見通し: ${weather.tomorrow}（最低${weather.tomorrowTemp.min}℃ / 最高${weather.tomorrowTemp.max}℃）

【マーケット速報】
ドル円: ${markets.usdJpy}円
日経平均: ${markets.nikkei}円
ナスダック: ${markets.nasdaq}
S&P500: ${markets.sp500}
ビットコイン: $${markets.bitcoin}
イーサリアム: $${markets.ethereum}
ソラナ: $${markets.solana}

【今日の鉄鋼業界ニュース】
${steelNews}

【営業×AI・DX推進ニュース】
${aiDxNews}

【不動産・投資動向】
${realestateNews}

【スポーツ】
${sportsNews}
---

【原稿の構成と書き方ルール】
1. 冒頭（30秒）：「おはようございます」から始め、今日の日付と曜日を自然に入れる
2. 天気コーナー（1分）：数字だけ読まず「外回りには${Number(weather.todayTemp.max) >= 30 ? "きつい暑さですね" : "過ごしやすい気候ですね"}」のように実感を添える
3. マーケット速報（2分）：数字を読み上げ、為替や株の動きを「これって円安が続いてますね」など一言コメント。仮想通貨は「ビットコインは〜ドルで、先週と比べると…」のように温度感を出す
4. 鉄鋼ニュースコーナー（4〜5分）：
   - タイトルをそのまま読まず会話調に崩す（「〇〇という話が出ていまして」）
   - 背景・意味を1〜2文補足（「要するに〜ということですよね」）
   - 営業視点のひとこと（「お客さんとの話題にできそう」「見積もりに影響するかも」）
5. 営業×AI・DXコーナー（2〜3分）：
   - 営業マンとして「これは使えそう」「こういうツールが広まってきてる」という視点でコメント
   - 難しいIT用語はかみ砕いて説明する
6. 不動産・投資コーナー（2分）：
   - 地価や投資動向を「ワンルーム持ってる人には気になる話ですよね」のような投資家目線で話す
7. スポーツコーナー（1〜2分）：試合結果や注目ニュースを気軽なトーンで。情報がない場合は「昨日は試合がなかったですね、次の試合が楽しみです」程度でOK
8. 締め（30秒）：短く元気よく。今日も頑張れる一言で終わる

【禁止事項】
- 「承知しました」「以下の通りです」などAIっぽい表現は絶対に使わない
- 【】◆★などの記号は一切使わない
- 箇条書きにしない。全部つながった話し言葉で書く
- URLは読まない
- 取得できなかったデータ（「取得不可」）はさらっとスキップする

原稿のみ出力してください。説明や前置きは不要です。`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text ?? "";
}
