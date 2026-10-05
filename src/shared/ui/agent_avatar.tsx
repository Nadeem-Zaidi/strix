import { useId } from "react";

// Every new agent is created with this emoji (see EMPTY in agent_editor.tsx),
// so it's what most agents carry. It renders as a cartoon robot that looks
// different on every OS, so we swap it for a crisp vector mark instead.
export const DEFAULT_AGENT_ICON = "🤖";

// Gradient tile with a solid, rounded bot face. Filled shapes (not thin
// strokes) keep it crisp from 14px sidebar rows up to 64px headers. Sized in
// `em` so it drops into any spot that showed the emoji and inherits its font-size.
export function AgentMark({ className = "" }: { className?: string }) {
  const id = useId();
  const tile = `${id}-tile`;
  const shine = `${id}-shine`;
  return (
    <svg className={`agent-mark ${className}`} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id={tile} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7cc2ec" />
          <stop offset="0.55" stopColor="#4a97d0" />
          <stop offset="1" stopColor="#2b67a6" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9.5" fill={`url(#${tile})`} />
      <rect width="32" height="16" rx="9.5" fill={`url(#${shine})`} />
      {/* antenna */}
      <path d="M16 7.4v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="6.6" r="1.7" fill="#fff" />
      {/* ears */}
      <rect x="4.6" y="15.2" width="2.4" height="5" rx="1.2" fill="#fff" opacity="0.8" />
      <rect x="25" y="15.2" width="2.4" height="5" rx="1.2" fill="#fff" opacity="0.8" />
      {/* head */}
      <rect x="7.6" y="10.6" width="16.8" height="14.2" rx="5.4" fill="#fff" />
      {/* eyes + smile */}
      <rect x="11.5" y="15" width="2.8" height="4.2" rx="1.4" fill="#2b67a6" />
      <rect x="17.7" y="15" width="2.8" height="4.2" rx="1.4" fill="#2b67a6" />
      <path d="M13.9 21.4c1.3.9 2.9.9 4.2 0" fill="none" stroke="#4a97d0" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Shows the agent's chosen emoji, or the vector mark for the default robot.
export function AgentAvatar({ icon, className }: { icon?: string | null; className?: string }) {
  if (!icon || icon === DEFAULT_AGENT_ICON) return <AgentMark className={className} />;
  return <>{icon}</>;
}
