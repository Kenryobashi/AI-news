// Podcast RSS フィード（feed.xml）を生成・更新する
// XMLパーサーを使わず文字列で組み立てることで重複・破損を防ぐ

import { readFile, writeFile } from "fs/promises";
import { stat } from "fs/promises";

export interface EpisodeMeta {
  title: string;
  description: string;
  mp3Filename: string; // episodes/2026-06-27.mp3
  pubDate: string;     // RFC 2822 形式
  durationSec: number;
  baseUrl: string;     // https://username.github.io/repo-name
}

interface Episode {
  title: string;
  description: string;
  url: string;
  guid: string;
  pubDate: string;
  length: number;
  duration: string;
}

const FEED_PATH_JSON = "docs/episodes.json"; // エピソード一覧をJSONで管理

async function loadEpisodes(): Promise<Episode[]> {
  try {
    const raw = await readFile(FEED_PATH_JSON, "utf-8");
    return JSON.parse(raw) as Episode[];
  } catch {
    return [];
  }
}

function buildFeedXml(episodes: Episode[], baseUrl: string): string {
  const items = episodes
    .map(
      (ep) => `
    <item>
      <title>${escXml(ep.title)}</title>
      <description>${escXml(ep.description)}</description>
      <enclosure url="${ep.url}" length="${ep.length}" type="audio/mpeg"/>
      <guid isPermaLink="false">${ep.guid}</guid>
      <pubDate>${ep.pubDate}</pubDate>
      <itunes:duration>${ep.duration}</itunes:duration>
    </item>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>My新聞 - 朝の通勤ラジオ</title>
    <link>${baseUrl}</link>
    <language>ja</language>
    <description>毎朝7時に自動生成される個人向けニュース音声番組</description>
    <itunes:author>My Newspaper</itunes:author>
    <itunes:category text="News"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
}

function escXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function getFileSize(path: string): Promise<number> {
  try {
    return (await stat(path)).size;
  } catch {
    return 0;
  }
}

export async function updateFeed(
  feedPath: string,
  episode: EpisodeMeta
): Promise<void> {
  const url = `${episode.baseUrl}/${episode.mp3Filename}`;
  // guidにpubDateのタイムスタンプを含めてユニークにする
  const guid = `${url}?t=${new Date(episode.pubDate).getTime()}`;

  const newEp: Episode = {
    title: episode.title,
    description: episode.description,
    url,
    guid,
    pubDate: episode.pubDate,
    length: await getFileSize(`docs/${episode.mp3Filename}`),
    duration: formatDuration(episode.durationSec),
  };

  const episodes = await loadEpisodes();

  // 同じguidがあれば上書き、なければ先頭に追加（最新30件）
  const idx = episodes.findIndex((e) => e.guid === guid);
  if (idx >= 0) {
    episodes[idx] = newEp;
  } else {
    episodes.unshift(newEp);
  }
  const trimmed = episodes.slice(0, 30);

  // JSONとXMLを両方保存
  await writeFile(FEED_PATH_JSON, JSON.stringify(trimmed, null, 2), "utf-8");
  await writeFile(feedPath, buildFeedXml(trimmed, episode.baseUrl), "utf-8");
}
