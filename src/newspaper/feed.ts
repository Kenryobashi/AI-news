// Podcast RSS フィード（feed.xml）を生成・更新する

import { readFile, writeFile } from "fs/promises";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { stat } from "fs/promises";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: "@_", format: true });

export interface EpisodeMeta {
  title: string;
  description: string;
  mp3Filename: string; // episodes/2025-06-27.mp3
  pubDate: string;     // RFC 2822 形式
  durationSec: number;
  baseUrl: string;     // https://username.github.io/repo-name
}

export async function updateFeed(
  feedPath: string,
  episode: EpisodeMeta
): Promise<void> {
  let feed: object;

  try {
    const xml = await readFile(feedPath, "utf-8");
    feed = parser.parse(xml) as object;
  } catch {
    // フィードが存在しない場合は新規作成
    feed = buildEmptyFeed(episode.baseUrl);
  }

  const f = feed as Record<string, unknown>;
  const rss = f["rss"] as Record<string, unknown>;
  const channel = rss["channel"] as Record<string, unknown>;

  const newItem = {
    title: episode.title,
    description: episode.description,
    enclosure: {
      "@_url": `${episode.baseUrl}/${episode.mp3Filename}`,
      "@_length": await getFileSize(`docs/${episode.mp3Filename}`),
      "@_type": "audio/mpeg",
    },
    guid: `${episode.baseUrl}/${episode.mp3Filename}`,
    pubDate: episode.pubDate,
    "itunes:duration": formatDuration(episode.durationSec),
  };

  const existingItems = channel["item"];
  if (!existingItems) {
    channel["item"] = [newItem];
  } else {
    const items = Array.isArray(existingItems) ? existingItems : [existingItems];
    // 最新30件のみ保持
    channel["item"] = [newItem, ...items].slice(0, 30);
  }

  channel["lastBuildDate"] = episode.pubDate;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${builder.build(feed)}`;
  await writeFile(feedPath, xml, "utf-8");
}

function buildEmptyFeed(baseUrl: string): object {
  return {
    rss: {
      "@_version": "2.0",
      "@_xmlns:itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
      channel: {
        title: "My新聞 - 朝の通勤ラジオ",
        link: baseUrl,
        language: "ja",
        description: "毎朝7時に自動生成される個人向けニュース音声番組",
        "itunes:author": "My Newspaper",
        "itunes:category": { "@_text": "News" },
        lastBuildDate: new Date().toUTCString(),
        item: [],
      },
    },
  };
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function getFileSize(path: string): Promise<number> {
  try {
    const s = await stat(path);
    return s.size;
  } catch {
    return 0;
  }
}
