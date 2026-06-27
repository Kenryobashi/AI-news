// Edge TTS（msedge-tts）でテキストをMP3に変換する（APIキー不要・無料）
// toStream を段落ごとに呼び出して結合し、自然な間を作る

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { writeFile } from "fs/promises";

const VOICE = "ja-JP-KeitaNeural";

// 無音バッファを生成（44バイトのWAVヘッダ相当のMP3フレームの代わりに空バッファ）
// Edge TTSの出力はMP3なので、段落間は短いポーズ用テキストで代用する
const PAUSE_TEXT = "　。　。"; // 読み上げると自然な間になる

async function streamToBuffer(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });
  return Buffer.concat(chunks);
}

export async function textToMp3(
  script: string,
  outputPath: string
): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  // 段落ごとに分割して個別に変換し、間にポーズを挟む
  const paragraphs = script
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const buffers: Buffer[] = [];
  for (const para of paragraphs) {
    const audioBuf = await streamToBuffer(tts, para);
    buffers.push(audioBuf);
    // 段落間にポーズ（短い無音読み上げ）
    const pauseBuf = await streamToBuffer(tts, PAUSE_TEXT);
    buffers.push(pauseBuf);
  }

  await writeFile(outputPath, Buffer.concat(buffers));
}
