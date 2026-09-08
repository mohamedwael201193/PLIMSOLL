import { SiteNav } from "../components/SiteNav";

const MCP = "https://agent.binance.com/mcp/agentic";

export function Docs() {
  return (
    <div className="shell docs">
      <SiteNav />
      <main id="main" className="docs-main">
        <h1>Connect PLIMSOLL / Binance Agent OS</h1>
        <p className="lede">
          PLIMSOLL talks to official Agent OS MCP after runtime discovery. Tool names below were present
          on a LIVE tools/list on 8 Sep 2026. Re-discover before you depend on a name.
        </p>

        <section>
          <h2>Prerequisites</h2>
          <ul>
            <li>A Binance account that can create an Agentic sub-account.</li>
            <li>An MCP client (Cursor, Claude Code, Codex, or ChatGPT) that speaks Streamable HTTP.</li>
            <li>Scopes you actually intend to grant. Trading is optional. Withdrawal is never required.</li>
          </ul>
        </section>

        <section>
          <h2>Official MCP endpoint</h2>
          <pre><code>{MCP}</code></pre>
          <p>
            Docs: developers.binance.com/en/docs/agent-native/mcp-server and
            /mcp-server/agentic. Product page: binance.com/en/agent-os.
          </p>
        </section>

        <section>
          <h2>Authentication</h2>
          <p>
            The client opens a Binance OAuth browser flow. PLIMSOLL never stores that token in the
            frontend. The production API holds a server-side token only when you put it in Render env,
            and writes stay off until WRITES_ENABLED=true.
          </p>
        </section>

        <section>
          <h2>Claude Code</h2>
          <pre>
            <code>{`claude mcp add binance-mcp-server --transport http ${MCP}`}</code>
          </pre>
          <p>Then /mcp, authenticate, assign the Agentic sub-account, enable only the scopes you want.</p>
        </section>

        <section>
          <h2>Cursor</h2>
          <p>
            Add an MCP server with transport HTTP and URL {MCP}. Authenticate when prompted. Map the
            session to the Agentic sub-account, not a Normal sub-account.
          </p>
        </section>

        <section>
          <h2>Scopes and the Agentic sub-account</h2>
          <p>
            Use the Agentic Sub for execution. MCP getAccount reports SPOT; it does not label Agentic
            vs master. Confirm the box in the Binance operator UI. Granted scopes in our last LIVE
            session included account read, spot trade, and wallet transfer. canWithdraw on the Spot
            account flag is not an MCP withdraw tool.
          </p>
        </section>

        <section>
          <h2>Tool discovery</h2>
          <p>
            initialize, then tools/list with pagination, then tool_search. Do not freeze a tool map.
            Last LIVE count: 125 unique tools. Required names for PLIMSOLL: spot.depth, spot.ticker24hr,
            spot.getAccount, spot.getOrder, spot.getOpenOrders, spot.newOrder.
          </p>
        </section>

        <section>
          <h2>MCP examples from current schemas</h2>
          <pre>
            <code>{`tools/call  name=spot.getAccount
  arguments: { "omitZeroBalances": true }

tools/call  name=spot.depth
  arguments: { "symbol": "ARKUSDT" }

tools/call  name=spot.getOrder
  arguments: { "symbol": "ARKUSDT", "origClientOrderId": "plim_..." }

tools/call  name=spot.newOrder
  required: symbol, side, type
  optional: quantity, quoteOrderQty, newClientOrderId
  PLIMSOLL will not call this unless you type CONFIRM`}</code>
          </pre>
        </section>

        <section>
          <h2>Safety</h2>
          <ul>
            <li>No withdrawal capability is used by PLIMSOLL.</li>
            <li>Dedicated Agentic sub-account.</li>
            <li>CONFIRM in this chat is the only live financial authorization.</li>
            <li>Approvals bind to a snapshot hash and expire.</li>
            <li>Stale hash, kill switch, or missing MCP tool fails closed.</li>
            <li>Read-back of the order and the account before any retry.</li>
          </ul>
        </section>

        <section>
          <h2>Troubleshooting</h2>
          <ul>
            <li>Cursor MCP namespace error: authenticate the Binance MCP server in Cursor settings.</li>
            <li>HTTP 418 from a cloud IP: official market-data host data-api.binance.vision is used for public REST only.</li>
            <li>minNotional: live ARKUSDT NOTIONAL min is 5 USDT. Quote below that will not legalize.</li>
            <li>Writes stay off on https://plimsoll-oregon.onrender.com unless you change the env var.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
