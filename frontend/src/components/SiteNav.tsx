import { NavLink } from "react-router-dom";

export function SiteNav({ variant = "marketing" }: { variant?: "marketing" | "desk" }) {
  return (
    <header className={variant === "desk" ? "nav nav-desk" : "nav"}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <NavLink to="/" className="wordmark" end>
        PLIMSOLL
      </NavLink>
      <nav aria-label="Primary">
        <NavLink to="/desk">Desk</NavLink>
        <NavLink to="/docs">Agent OS</NavLink>
      </nav>
    </header>
  );
}
