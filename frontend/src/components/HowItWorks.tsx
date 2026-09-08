import { useState } from "react";

const STEPS = [
  {
    title: "State your intent",
    body: "Say what you want to hold, for how long, and what exit cost you will accept.",
  },
  {
    title: "Measure exit capacity",
    body: "Deterministic code walks the live bid book and 24h volume. The model does not size the order.",
  },
  {
    title: "Propose a legal plan",
    body: "Fill, size down, stage, wait, or refuse. Filters clip the order before anyone is asked to approve.",
  },
  {
    title: "Verify, then re-solve",
    body: "If you hold the asset, PLIMSOLL keeps checking. Capacity drift is a proposal, never a silent sell.",
  },
];

export function HowItWorks() {
  const [open, setOpen] = useState(0);
  return (
    <div className="how" role="list">
      {STEPS.map((step, i) => {
        const active = open === i;
        return (
          <button
            key={step.title}
            type="button"
            role="listitem"
            className={active ? "how-slice is-open" : "how-slice"}
            onClick={() => setOpen(i)}
            onMouseEnter={() => setOpen(i)}
            aria-expanded={active}
          >
            <strong>{step.title}</strong>
            {active ? <p>{step.body}</p> : null}
          </button>
        );
      })}
    </div>
  );
}
