// Google News RSS からキーワードで最新ニュースを取得する（APIキー不要・無料）

import { XMLParser } from "fast-xml-parser";

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

const parser = new XMLParser({ ignoreAttributes: false });

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
  return list.slice(0, max).map((item) => ({
    title: String(item.title ?? ""),
    link: String(item.link ?? ""),
    pubDate: String(item.pubDate ?? ""),
    description: String(item.description ?? "").replace(/<[^>]+>/g, ""),
  }));
}

export interface NewsByCategory {
  steel: NewsItem[];
}

export async function fetchAllNews(): Promise<NewsByCategory> {
  const steel = await fetchGoogleNewsRss("鉄鋼 日本製鉄 JFE 神戸製鋼", 5);
  return { steel };
}
