import { useEffect, useState } from "react";
import { tokenGlyph, tokenIconCandidates } from "../lib/tokenCandidates";

function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function resolveMark(symbol: string, contract?: string | null): Promise<string> {
  const key = `icon:${symbol}:${contract ?? ""}`;
  try {
    const cached = sessionStorage.getItem(key);
    if (cached !== null) return cached;
  } catch {
    /* private mode */
  }
  const urls = tokenIconCandidates(symbol, contract);
  for (const url of urls) {
    if (await probe(url)) {
      try {
        sessionStorage.setItem(key, url);
      } catch {
        /* ignore */
      }
      return url;
    }
  }
  try {
    sessionStorage.setItem(key, "");
  } catch {
    /* ignore */
  }
  return "";
}

export function TokenMark({
  symbol,
  contract,
  size = 28,
}: {
  symbol: string;
  contract?: string | null;
  size?: number;
}) {
  const [src, setSrc] = useState("");
  const glyph = tokenGlyph(symbol);

  useEffect(() => {
    let alive = true;
    setSrc("");
    resolveMark(symbol, contract).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [symbol, contract]);

  return (
    <span className="token-mark" style={{ width: size, height: size }} title={symbol} aria-hidden={!src}>
      {src ? <img src={src} alt="" /> : <span className="token-glyph">{glyph}</span>}
    </span>
  );
}
