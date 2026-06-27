// My新聞 エントリポイント
// 実行: GEMINI_API_KEY=xxx npm run newspaper
// 全工程: 天気取得 → ニュース取得 → スクリプト生成 → TTS変換 → Podcast更新

import { fetchWeather } from "./weather.js";
import { fetchAllNews } from "./rss.js";
import { generateScript } from "./script.js";
import { textToMp3 } from "./tts.js";
import { updateFeed } from "./feed.js";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GITHUB_PAGES_BASE_URL = process.env.GITHUB_PAGES_BASE_URL ?? "http://localhost";

if (!GEMINI_API_KEY) {
  console.error("[ERROR] GEMINI_API_KEY が設定されていません");
  process.exit(1);
}

async function main() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10); // 2025-06-27
  const mp3Filename = `episodes/${dateStr}.mp3`;
  const mp3Path = `docs/${mp3Filename}`;
  const feedPath = "docs/feed.xml";

  if (!existsSync("docs/episodes")) {
    await mkdir("docs/episodes", { recursive: true });
  }

  console.info("[1/4] 天気・ニュース取得中...");
  const [weather, news] = await Promise.all([
    fetchWeather(),
    fetchAllNews(),
  ]);
  console.info(`→ 天気: ${weather.today} / 鉄鋼ニュース: ${news.steel.length}件`);

  console.info("[2/4] Gemini で読み上げ原稿を生成中...");
  const script = await generateScript(weather, news, GEMINI_API_KEY);
  console.info(`→ 原稿: ${script.length}文字`);

  console.info("[3/4] Edge TTS で音声に変換中...");
  await textToMp3(script, mp3Path);
  console.info(`→ 保存: ${mp3Path}`);

  console.info("[4/4] Podcast フィードを更新中...");
  const pubDate = today.toUTCString();
  await updateFeed(feedPath, {
    title: `My新聞 ${dateStr}`,
    description: `${dateStr}の朝刊。天気・鉄鋼業界ニュース。`,
    mp3Filename,
    pubDate,
    durationSec: 480, // 8分の目安
    baseUrl: GITHUB_PAGES_BASE_URL,
  });
  console.info(`→ フィード更新: ${feedPath}`);

  console.info("\n✅ 完了！");
  console.info(`Podcast URL: ${GITHUB_PAGES_BASE_URL}/feed.xml`);
  console.info(`MP3 URL:     ${GITHUB_PAGES_BASE_URL}/${mp3Filename}`);
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
