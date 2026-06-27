// Edge TTS（msedge-tts）でテキストをMP3に変換する（APIキー不要・無料）

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { writeFile } from "fs/promises";

// ja-JP-KeitaNeural: 男性・自然な日本語・エネルギッシュ
const VOICE = "ja-JP-KeitaNeural";

export async function textToMp3(
  script: string,
  outputPath: string
): Promise<void> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const { audioStream } = tts.toStream(script);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
    audioStream.on("end", resolve);
    audioStream.on("error", reject);
  });

  await writeFile(outputPath, Buffer.concat(chunks));
}
