// スポーツ情報をGoogle News RSSで取得する（APIキー不要・無料）
// 既読記事はrss.tsと共通のseen-articles.jsonで管理

import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "fs/promises";

const parser = new XMLParser({ ignoreAttributes: false });
const SEEN_PATH = "docs/seen-articles.json";
const SEEN_TTL_DAYS = 3; // スポーツは3日間除外（試合結果は鮮度が大事）

export interface SportsItem {
  team: string;
  title: string;
  description: string;
  pubDate: string;
}

async function loadSeen(): Promise<Record<string, string>> {
  try {
    const raw = await readFile(SEEN_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

async function saveSeen(seen: Record<string, string>): Promise<void> {
  const cutoff = Date.now() - SEEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const trimmed = Object.fromEntries(
    Object.entries(seen).filter(([, dateStr]) => new Date(dateStr).getTime() > cutoff)
  );
  await writeFile(SEEN_PATH, JSON.stringify(trimmed, null, 2), "utf-8");
}

async function fetchTeamNews(team: string, query: string, max = 2): Promise<SportsItem[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=ja&gl=JP&ceid=JP:ja`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MyNewspaper/1.0)" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml) as {
      rss: { channel: { item: { title: string; description: string; pubDate: string } | Array<{ title: string; description: string; pubDate: string }> } };
    };
    const items = parsed.rss?.channel?.item;
    if (!items) return [];
    const list = Array.isArray(items) ? items : [items];
    return list.slice(0, max * 3).map((item) => ({
      team,
      title: String(item.title ?? ""),
      description: String(item.description ?? "").replace(/<[^>]+>/g, ""),
      pubDate: String(item.pubDate ?? ""),
    }));
  } catch {
    return [];
  }
}

export interface SportsData {
  worldcup: SportsItem[];
  baseball: SportsItem[];
  soccer: SportsItem[];
  basketball: SportsItem[];
}

export async function fetchSports(): Promise<SportsData> {
  const seen = await loadSeen();
  const now = new Date().toISOString();

  const [rawWorldcup, rawBaseball, rawSoccer, rawBasketball] = await Promise.all([
    fetchTeamNews("ワールドカップ", "ワールドカップ サッカー 日本代表 試合結果 2026", 4),
    fetchTeamNews("横浜DeNAベイスターズ", "横浜DeNAベイスターズ 試合", 2),
    fetchTeamNews("ギラヴァンツ北九州", "ギラヴァンツ北九州", 2),
    fetchTeamNews("ライジングゼファーフクオカ", "ライジングゼファー バスケ", 2),
  ]);

  const filterNew = (items: SportsItem[], max: number): SportsItem[] =>
    items.filter((item) => !seen[item.title]).slice(0, max);

  const worldcup = filterNew(rawWorldcup, 4);
  const baseball = filterNew(rawBaseball, 2);
  const soccer = filterNew(rawSoccer, 2);
  const basketball = filterNew(rawBasketball, 2);

  for (const item of [...worldcup, ...baseball, ...soccer, ...basketball]) {
    seen[item.title] = now;
  }
  await saveSeen(seen);

  return { worldcup, baseball, soccer, basketball };
}
