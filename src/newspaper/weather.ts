// 気象庁API（登録不要・完全無料）で北九州市の天気を取得する

const KITAKYUSHU_AREA_CODE = "400000"; // 福岡県
const KITAKYUSHU_OFFICE_CODE = "400020"; // 北九州地方

interface JmaForecast {
  timeSeries: Array<{
    timeDefines: string[];
    areas: Array<{
      area: { name: string; code: string };
      weatherCodes?: string[];
      weathers?: string[];
      winds?: string[];
      temps?: string[];
      pops?: string[];
    }>;
  }>;
}

const WEATHER_CODES: Record<string, string> = {
  "100": "晴れ",
  "101": "晴れ時々曇り",
  "102": "晴れ一時雨",
  "110": "晴れのち曇り",
  "111": "晴れのち雨",
  "200": "曇り",
  "201": "曇り時々晴れ",
  "202": "曇り一時雨",
  "210": "曇りのち晴れ",
  "218": "曇りのち雨",
  "300": "雨",
  "301": "雨時々晴れ",
  "302": "雨時々止む",
  "400": "雪",
  "500": "霧",
};

function decodeWeather(code: string): string {
  return WEATHER_CODES[code] ?? `天気コード${code}`;
}

export interface WeatherSummary {
  today: string;
  tomorrow: string;
  todayTemp: { min: string; max: string };
  tomorrowTemp: { min: string; max: string };
  todayPop: string; // 降水確率
}

export async function fetchWeather(): Promise<WeatherSummary> {
  const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${KITAKYUSHU_AREA_CODE}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`気象庁API エラー: ${res.status}`);

  const data = (await res.json()) as JmaForecast[];
  const forecast = data[0];
  if (!forecast) throw new Error("気象庁API: データが空です");

  // timeSeries[0]: 天気・風（3日間）
  const weatherSeries = forecast.timeSeries[0];
  if (!weatherSeries) throw new Error("気象庁API: timeSeries[0] が取得できません");
  const kitakyushuArea =
    weatherSeries.areas.find((a) => a.area.code === KITAKYUSHU_OFFICE_CODE) ??
    weatherSeries.areas[0];
  if (!kitakyushuArea) throw new Error("気象庁API: 北九州市エリアが見つかりません");

  const todayCode = kitakyushuArea.weatherCodes?.[0] ?? "";
  const tomorrowCode = kitakyushuArea.weatherCodes?.[1] ?? "";

  // timeSeries[1]: 降水確率
  const popSeries = forecast.timeSeries[1];
  if (!popSeries) throw new Error("気象庁API: timeSeries[1] が取得できません");
  const popArea =
    popSeries.areas.find((a) => a.area.code === KITAKYUSHU_OFFICE_CODE) ??
    popSeries.areas[0];
  if (!popArea) throw new Error("気象庁API: 降水確率エリアが見つかりません");
  const pops = popArea.pops ?? [];
  // 今日の降水確率は最初の値（0-6時はスキップして昼の値を使う）
  const todayPop = pops[1] ?? pops[0] ?? "-";

  // timeSeries[2]: 気温（最低・最高）
  const tempSeries = forecast.timeSeries[2];
  if (!tempSeries) throw new Error("気象庁API: timeSeries[2] が取得できません");
  const tempArea = tempSeries.areas[0];
  if (!tempArea) throw new Error("気象庁API: 気温エリアが見つかりません");
  const temps = tempArea.temps ?? [];

  return {
    today: decodeWeather(todayCode),
    tomorrow: decodeWeather(tomorrowCode),
    todayTemp: { min: temps[0] ?? "-", max: temps[1] ?? "-" },
    tomorrowTemp: { min: temps[2] ?? "-", max: temps[3] ?? "-" },
    todayPop,
  };
}
