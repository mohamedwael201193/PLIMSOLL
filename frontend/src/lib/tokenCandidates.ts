const LATIN = /^[A-Za-z0-9]{2,12}$/;
const CJK = /[\u3000-\u9fff]/;

export function tokenIconCandidates(symbol: string, contract?: string | null): string[] {
  const s = symbol.toLowerCase();
  const urls: string[] = [];
  const c = (contract ?? "").trim();

  if (LATIN.test(symbol)) {
    urls.push(`https://assets.coincap.io/assets/icons/${s}@2x.png`);
    urls.push(`https://cdn.jsdelivr.net/gh/0xa3k5/web3icons@main/raw-svgs/tokens/branded/${s}.svg`);
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(c)) {
    const addr = c.toLowerCase();
    urls.push(
      `https://dd.dexscreener.com/ds-data/tokens/ethereum/${addr}.png`,
      `https://dd.dexscreener.com/ds-data/tokens/base/${addr}.png`,
      `https://dd.dexscreener.com/ds-data/tokens/bsc/${addr}.png`,
    );
  } else if (c.length >= 32 && c.length <= 48 && !c.startsWith("0x") && !CJK.test(symbol)) {
    urls.push(`https://dd.dexscreener.com/ds-data/tokens/solana/${c}.png`);
  }
  if (LATIN.test(symbol)) {
    urls.push(`https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${s}.svg`);
  }
  return urls;
}

export function tokenGlyph(symbol: string): string {
  const trimmed = symbol.replace(/USDT$|USDC$/i, "") || symbol;
  const chars = [...trimmed];
  if (CJK.test(symbol)) return chars.slice(0, 2).join("");
  return chars.slice(0, 2).join("").toUpperCase();
}

export function baseAsset(symbol: string): string {
  return symbol.replace(/USDT$|USDC$|BUSD$|FDUSD$/i, "") || symbol;
}
