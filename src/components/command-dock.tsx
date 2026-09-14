"use client";
import { Home, BookOpen, HeartHandshake, Mountain } from "lucide-react";
export type DockDestination = "home" | "faith" | "apollo" | "connect" | "performance";
export function CommandDock({ active, onNavigate, onFeedback, inactive = false }: { active: string; onNavigate: (destination: DockDestination) => void; onFeedback?: () => void; inactive?: boolean }) {
  return <nav className="command-dock" aria-label="Quick navigation" inert={inactive} aria-hidden={inactive || undefined}>
    {([ ["home", "Home", Home], ["faith", "Faith", BookOpen], ["apollo", "Apollo", null], ["connect", "Juntos", HeartHandshake], ["performance", "Ascend", Mountain] ] as const).map(([id, label, Icon]) =>
      <button key={id} className={id === "apollo" ? "dock-apollo" : "dock-destination"} aria-label={id === "apollo" ? "Open Apollo" : id === "connect" ? "Open Juntos" : label} aria-current={active === id ? "page" : undefined} onClick={() => { onFeedback?.(); onNavigate(id); }}>
        {Icon ? <Icon size={21} strokeWidth={1.5} /> : <span className="dock-core" aria-hidden="true"><span /></span>}
        <span>{label}</span>
      </button>)}
  </nav>;
}
