// Edge TTS（msedge-tts）でテキストをMP3に変換する（APIキー不要・無料）
// SSMLで速度・ピッチ・間を調整して人間らしい話し方にする

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { writeFile } from "fs/promises";

const VOICE = "ja-JP-KeitaNeural";

function toSSML(text: string): string {
  // 改行を自然な間（ポーズ）に変換し、全体の話し方を調整
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  // 段落ごとに分割して間を挿入
  const withBreaks = escaped
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, '<break time="400ms"/>')}</p>`)
    .join('<break time="700ms"/>');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
  <voice name="${VOICE}">
    <prosody rate="-8%" pitch="-3%">
      ${withBreaks}
    </prosody>
  </voice>
</speak>`;
}

export async function textToMp3(
  script: string,
  outputPath: string
): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const ssml = toSSML(script);
  const { audioStream } = tts.rawToStream(ssml);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });

  await writeFile(outputPath, Buffer.concat(chunks));
}
