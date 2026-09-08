"use client";

interface Props {
  text: string;
  variant?: "dark" | "gold";
  reverse?: boolean;
  speed?: number;
}

export default function Marquee({ text, variant = "dark", reverse = false, speed = 40 }: Props) {
  const content = Array(6).fill(text);
  const isGold = variant === "gold";

  return (
    <div
      className={`relative overflow-hidden border-y ${
        isGold
          ? "bg-plimsoll text-plimsoll-black border-plimsoll-black"
          : "bg-plimsoll-black text-plimsoll border-plimsoll/20"
      } marquee-paused py-3 sm:py-4 select-none`}
      aria-hidden
    >
      <div
        className={`marquee-track ${reverse ? "reverse" : ""}`}
        style={{ ["--marquee-speed" as string]: `${speed}s` }}
      >
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 items-center">
            {content.map((t, i) => (
              <span
                key={`${half}-${i}`}
                className={`flex items-center whitespace-nowrap ${
                  isGold ? "font-display text-sm sm:text-lg tracking-[0.08em]" : "font-grotesk font-bold text-base sm:text-xl tracking-[0.04em]"
                }`}
              >
                <span className="px-4 sm:px-6">{t}</span>
                <span className={isGold ? "text-plimsoll-black/60" : "text-plimsoll/60"}>•</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
