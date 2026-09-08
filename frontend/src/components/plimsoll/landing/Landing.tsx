"use client";

import Hero from "../Hero";
import Marquee from "../Marquee";
import HiddenProblem from "./HiddenProblem";
import LoadLine from "./LoadLine";
import HowItThinks from "./HowItThinks";
import LiveCapacity from "./LiveCapacity";
import ReSolve from "./ReSolve";
import AgentOs from "./AgentOs";
import Safety from "./Safety";
import ProductPreview from "./ProductPreview";
import Technical from "./Technical";
import AgentCharacters from "./AgentCharacters";
import CtaSection from "./CtaSection";

interface Props {
  glitch: boolean;
}

export default function Landing({ glitch }: Props) {
  return (
    <main>
      <Hero glitch={glitch} />

      <Marquee
        text="THE MARKET HAS A LOAD LINE • YOUR PORTFOLIO SHOULD TOO • ESTIMATED EXIT CAPACITY UNDER STATED CONSTRAINTS"
        variant="dark"
      />

      <HiddenProblem glitch={glitch} />
      <LoadLine glitch={glitch} />
      <HowItThinks glitch={glitch} />
      <LiveCapacity glitch={glitch} />

      <Marquee
        text="MEASURED. LEGALIZED. APPROVED. — YOUR PORTFOLIO VALUE IS NOT YOUR EXIT CAPACITY"
        variant="gold"
        reverse
      />

      <ReSolve glitch={glitch} />
      <AgentOs glitch={glitch} />
      <Safety glitch={glitch} />
      <ProductPreview glitch={glitch} />
      <Technical glitch={glitch} />
      <AgentCharacters glitch={glitch} />
      <CtaSection glitch={glitch} />
    </main>
  );
}
