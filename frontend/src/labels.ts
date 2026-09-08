export type Classification = "LIVE" | "REPLAY" | "PAPER" | "TESTNET" | "SIMULATED" | "UNKNOWN";

export function classificationLabel(value: string | undefined): Classification {
  const allowed: Classification[] = ["LIVE", "REPLAY", "PAPER", "TESTNET", "SIMULATED", "UNKNOWN"];
  if (value && allowed.includes(value as Classification)) {
    return value as Classification;
  }
  return "UNKNOWN";
}

export function isLiveClaim(value: string | undefined): boolean {
  return classificationLabel(value) === "LIVE";
}
