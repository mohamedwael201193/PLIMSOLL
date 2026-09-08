import { Link } from "react-router-dom";
import { SiteNav } from "../components/SiteNav";
import { HeroScene } from "../components/HeroScene";
import { ScrollSpine } from "../components/ScrollSpine";
import { HowItWorks } from "../components/HowItWorks";
import { LiveCapacityStrip } from "../components/LiveCapacityStrip";

export function Landing() {
  return (
    <div className="shell">
      <SiteNav />
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <h1>The market has a load line.</h1>
            <p className="lede">
              PLIMSOLL estimates how much exposure fits the exit terms you choose.
            </p>
            <div className="cta-row">
              <Link className="btn" to="/desk">
                Open the desk
              </Link>
              <Link className="btn btn-ghost" to="/docs">
                Agent OS docs
              </Link>
            </div>
          </div>
          <HeroScene />
        </section>

        <ScrollSpine text="INVERT   LEGALIZE   APPROVAL   ACT   VERIFY   RE-INVERT   " />

        <section className="chapter">
          <h2>Size that looks fine at the mid can be un-exitable later.</h2>
          <p>
            A book, a clock, and a cost budget disagree. PLIMSOLL inverts the question: given live
            bids, 24h quote volume, fees, and your constitution, how much quote notional still fits
            an exit under those constraints?
          </p>
          <p className="quiet">
            This is estimated exit capacity under stated constraints. Not a maximum safe size. Not a
            guaranteed exit. Not a price forecast.
          </p>
        </section>

        <section className="chapter">
          <h2>How the agent actually works</h2>
          <HowItWorks />
        </section>

        <LiveCapacityStrip />

        <section className="chapter os">
          <h2>Built with Binance Agent OS. Not a Binance product.</h2>
          <p>
            Official MCP at agent.binance.com/mcp/agentic. Runtime tool discovery. Agentic sub-account
            for execution. Human CONFIRM for any live write. Snapshot hash binds the approval. Stale
            books fail closed. No silent sell.
          </p>
          <ul className="fact-grid">
            <li>
              <strong>Scout</strong>
              <span>Reads depth, ticker, and filters.</span>
            </li>
            <li>
              <strong>Cartographer</strong>
              <span>Walks cost, time, and visible book.</span>
            </li>
            <li>
              <strong>Executor</strong>
              <span>Places only after CONFIRM.</span>
            </li>
            <li>
              <strong>Watcher</strong>
              <span>Re-solves held exposure when the book moves.</span>
            </li>
            <li>
              <strong>Auditor</strong>
              <span>Explains binding constraint and read-back.</span>
            </li>
          </ul>
        </section>

        <section className="crew">
          <div className="crew-art">
            <img src="/characters/watcher.png" alt="" className="hero-art crew-watch" width="220" height="453" />
            <img src="/characters/scout.png" alt="" className="hero-art crew-scout" width="260" height="420" />
            <img src="/characters/cartographer.png" alt="" className="hero-art crew-carto" width="240" height="383" />
          </div>
          <div>
            <h2>A crew that maps to real code paths</h2>
            <p>
              Characters are not a mascot pack. Scout is market rails. Cartographer is the solver.
              Executor is MCP write + getOrder. Watcher is re-solve. Auditor is reconciliation copy.
            </p>
          </div>
        </section>

        <section className="chapter close">
          <h2>Your portfolio should have a load line too.</h2>
          <p>Then PLIMSOLL keeps checking.</p>
        </section>
      </main>
      <footer className="foot">
        <p>PLIMSOLL. Independent. Powered by Binance Agent OS when connected.</p>
        <p>
          <a href="https://github.com/mohamedwael201193/PLIMSOLL">GitHub</a>
          <a href="https://www.binance.com/en/agent-os">Agent OS</a>
        </p>
      </footer>
    </div>
  );
}
