// Google News RSS からキーワードで最新ニュースを取得する（APIキー不要・無料）
// 既読記事はJSONファイルで管理し、同じ記事が繰り返されるのを防ぐ

import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "fs/promises";

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

const parser = new XMLParser({ ignoreAttributes: false });
const SEEN_PATH = "docs/seen-articles.json";
const SEEN_TTL_DAYS = 7; // 7日間は同じ記事を除外

// 既読記事リストを読み込む
async function loadSeen(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(SEEN_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

// 既読記事リストを保存（7日以上前のものは削除）
async function saveSeen(seen: Record<string, string>): Promise<void> {
  const cutoff = Date.now() - SEEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const trimmed = Object.fromEntries(
    Object.entries(seen).filter(([, dateStr]) => new Date(dateStr).getTime() > cutoff)
  );
  await writeFile(SEEN_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
}

async function fetchGoogleNewsRss(query: string, max = 5): Promise<NewsItem[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=ja&gl=JP&ceid=JP:ja`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MyNewspaper/1.0)" },
  });
  if (!res.ok) throw new Error(`Google News RSS エラー: ${res.status} (${query})`);

  const xml = await res.text();
  const parsed = parser.parse(xml) as {
    rss: { channel: { item: NewsItem | NewsItem[] } };
  };

  const items = parsed.rss?.channel?.item;
  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];
  return list.slice(0, max * 3).map((item) => ({
    title: String(item.title ?? ""),
    link: String(item.link ?? ""),
    pubDate: String(item.pubDate ?? ""),
    description: String(item.description ?? "").replace(/<[^>]+>/g, ""),
  }));
}

export interface NewsByCategory {
  steel: NewsItem[];
  aiDx: NewsItem[];
  realestate: NewsItem[];
}

export async function fetchAllNews(): Promise<NewsByCategory> {
  // 既読リストを読み込む
  const seen = await loadSeen();
  const now = new Date().toISOString();

  // 各カテゴリを多めに取得してから既読除外
  const [rawSteel, rawAiDx, rawRealestate] = await Promise.all([
    fetchGoogleNewsRss("鉄鋼 日本製鉄 JFE 神戸製鋼", 5),
    fetchGoogleNewsRss("営業DX AI営業 セールステック CRM 生成AI ビジネス活用", 4),
    fetchGoogleNewsRss("不動産 地価 ワンルームマンション投資 土地価格 不動産市況", 4),
  ]);

  // タイトルをキーに既読除外（URLはGoogleリダイレクトで変わるためタイトルで判定）
  const filterNew = (items: NewsItem[], max: number): NewsItem[] =>
    items.filter((item) => !seen[item.title]).slice(0, max);

  const steel = filterNew(rawSteel, 5);
  const aiDx = filterNew(rawAiDx, 4);
  const realestate = filterNew(rawRealestate, 4);

  // 今日読んだ記事を既読に追加
  for (const item of [...steel, ...aiDx, ...realestate]) {
    seen[item.title] = now;
  }
  await saveSeen(seen);

  return { steel, aiDx, realestate };
}
