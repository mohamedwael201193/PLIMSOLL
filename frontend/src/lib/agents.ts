/**
 * PLIMSOLL agent roles — "financial intelligence entities".
 * Original characters. Each maps to a real product function
 * and to a stage of the agent loop.
 */

export interface AgentRole {
  id: string;
  name: string;
  role: string;
  line: string;
  loop: string;
  loopIndex: number;
  description: string;
  image: string;
  tags: string[];
}

export const AGENTS: AgentRole[] = [
  {
    id: "scout",
    name: "SCOUT",
    role: "THE OBSERVER",
    line: "Reads current market conditions.",
    loop: "OBSERVE",
    loopIndex: 0,
    description:
      "The scout never sleeps and never touches your funds. It streams the live order book, the 24-hour quote volume and the exchange filters into the snapshot the rest of the crew works from. If the feed is stale, the scout refuses to hand it over — stale snapshots refuse action.",
    image: "/agents/agent-scout.png",
    tags: ["DATA_DEPTH", "DATA_VOLUME", "DATA_FILTERS"],
  },
  {
    id: "cartographer",
    name: "CARTOGRAPHER",
    role: "THE MEASURER",
    line: "Maps how much the market can actually absorb.",
    loop: "UNDERSTAND",
    loopIndex: 1,
    description:
      "The cartographer walks the visible bid book level by level and charts two territories: cost capacity — how much notional can exit before impact plus fees cross your budget — and time capacity — how much participation allows within your horizon. Then it draws the line.",
    image: "/agents/agent-cartographer.png",
    tags: ["DATA_CAPACITY", "DATA_COST", "DATA_TIME"],
  },
  {
    id: "executor",
    name: "EXECUTOR",
    role: "THE ACTOR",
    line: "Moves only after an explicit approval.",
    loop: "ACT",
    loopIndex: 5,
    description:
      "The executor exists to be underestimated. It does nothing until the application has writes enabled, the snapshot hash is fresh, the approval token is unexpired and the operator has typed CONFIRM. Then it strikes once — through Binance Agent OS, on the agentic sub-account, and nothing else.",
    image: "/agents/agent-executor.png",
    tags: ["DATA_ORDER", "DATA_MCP", "DATA_CONFIRM"],
  },
  {
    id: "watcher",
    name: "WATCHER",
    role: "THE RE-SOLVER",
    line: "Tracks your position as the line moves.",
    loop: "ADAPT",
    loopIndex: 7,
    description:
      "The watcher re-solves your held position against every new snapshot. When the market thins, the line moves down and the watcher is the first to know — over capacity is flagged, never silently sold. A trim is proposed; the decision stays yours.",
    image: "/agents/agent-watcher.png",
    tags: ["DATA_RESOLVE", "DATA_LINE", "DATA_STATE"],
  },
  {
    id: "auditor",
    name: "AUDITOR",
    role: "THE VERIFIER",
    line: "Explains every decision with evidence.",
    loop: "VERIFY",
    loopIndex: 6,
    description:
      "The auditor reads back every order and reconciles every balance after the fact. Partial fills are not success — remaining size needs a new approval. Every payload the auditor signs is labelled LIVE, REPLAY, PAPER or SIMULATED. Nothing is invented on its watch.",
    image: "/agents/agent-auditor.png",
    tags: ["DATA_READBACK", "DATA_PROOF", "DATA_LEDGER"],
  },
];

export function getAgent(id: string): AgentRole | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** Hero composition (hero entity composition). */
export const HERO_AGENTS = {
  left: "/agents/hero-scout.png",
  center: "/agents/hero-cartographer.png",
  right: "/agents/hero-executor.png",
};

export const BIG_ENTITY = "/agents/big-entity.png";

export const AGENT_LOOP = [
  "OBSERVE",
  "UNDERSTAND",
  "PLAN",
  "DECIDE",
  "ASK",
  "ACT",
  "VERIFY",
  "ADAPT",
] as const;
