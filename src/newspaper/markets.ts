// 株価・為替・仮想通貨を無料APIで取得する

export interface MarketData {
  // 為替
  usdJpy: string;
  // 株価指数（前日終値）
  nikkei: string;
  nasdaq: string;
  sp500: string;
  // 仮想通貨（USD建て）
  bitcoin: string;
  ethereum: string;
  solana: string;
}

// Yahoo Finance の非公式JSONエンドポイント（無料・登録不要）
async function fetchYahooQuote(symbol: string): Promise<string> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MyNewspaper/1.0)" },
    });
    if (!res.ok) return "取得不可";
    const json = (await res.json()) as {
      chart: { result: Array<{ meta: { regularMarketPrice: number; currency: string } }> };
    };
    const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!price) return "取得不可";
    return price.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
  } catch {
    return "取得不可";
  }
}

// CoinGecko API（無料・登録不要）
async function fetchCryptoPrice(id: string): Promise<string> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MyNewspaper/1.0)" },
    });
    if (!res.ok) return "取得不可";
    const json = (await res.json()) as Record<string, { usd: number }>;
    const price = json[id]?.usd;
    if (!price) return "取得不可";
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } catch {
    return "取得不可";
  }
}

export async function fetchMarkets(): Promise<MarketData> {
  const [usdJpy, nikkei, nasdaq, sp500, bitcoin, ethereum, solana] =
    await Promise.all([
      fetchYahooQuote("USDJPY=X"),
      fetchYahooQuote("^N225"),
      fetchYahooQuote("^IXIC"),
      fetchYahooQuote("^GSPC"),
      fetchCryptoPrice("bitcoin"),
      fetchCryptoPrice("ethereum"),
      fetchCryptoPrice("solana"),
    ]);

  return { usdJpy, nikkei, nasdaq, sp500, bitcoin, ethereum, solana };
}
