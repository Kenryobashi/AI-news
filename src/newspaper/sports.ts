// スポーツ情報をGoogle News RSSで取得する（APIキー不要・無料）

import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false });

export interface SportsItem {
  team: string;
  title: string;
  description: string;
  pubDate: string;
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
    return list.slice(0, max).map((item) => ({
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
  worldcup: SportsItem[];   // FIFAワールドカップ（開催期間中）
  baseball: SportsItem[];   // 横浜DeNAベイスターズ
  soccer: SportsItem[];     // ギラヴァンツ北九州
  basketball: SportsItem[]; // ライジングゼファーフクオカ
}

export async function fetchSports(): Promise<SportsData> {
  const [worldcup, baseball, soccer, basketball] = await Promise.all([
    fetchTeamNews("ワールドカップ", "ワールドカップ サッカー 日本代表 試合結果 2026", 4),
    fetchTeamNews("横浜DeNAベイスターズ", "横浜DeNAベイスターズ 試合", 2),
    fetchTeamNews("ギラヴァンツ北九州", "ギラヴァンツ北九州", 2),
    fetchTeamNews("ライジングゼファーフクオカ", "ライジングゼファー バスケ", 2),
  ]);
  return { worldcup, baseball, soccer, basketball };
}
