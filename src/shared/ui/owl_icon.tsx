// A small animated owl mark for the "thinking" state, in place of the
// previous three-dot spinner + "Thinking…" text. Matches the app's existing
// owl branding (the sidebar calls the product "Strix" — the genus name for
// owls). Drawn as a single-color line icon (outline + two small filled
// details) rather than a multi-color cartoon face, so it reads as a
// standard UI glyph rather than a mascot; the pulsing ring + breathing
// scale is what actually signals "working" at a glance.
export const ThinkingOwl = () => (
  <span className="thinking-owl" aria-label="Thinking" role="status">
    <span className="thinking-owl__pulse" aria-hidden="true" />
    <svg
      className="thinking-owl__svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ear tufts */}
      <path
        className="thinking-owl__line"
        d="M8.2 5.8 L6.8 2.6 M15.8 5.8 L17.2 2.6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* head outline */}
      <path
        className="thinking-owl__line"
        d="M12 4.2c-3.2 0-5.6 2.5-5.6 5.9v3c0 3.4 2.4 5.9 5.6 5.9s5.6-2.5 5.6-5.9v-3c0-3.4-2.4-5.9-5.6-5.9Z"
        strokeWidth="1.5"
      />

      {/* eyes */}
      <circle className="thinking-owl__line" cx="9.3" cy="10.6" r="1.7" strokeWidth="1.4" />
      <circle className="thinking-owl__line" cx="14.7" cy="10.6" r="1.7" strokeWidth="1.4" />
      <circle className="thinking-owl__pupil" cx="9.3" cy="10.6" r="0.55" />
      <circle className="thinking-owl__pupil" cx="14.7" cy="10.6" r="0.55" />

      {/* beak */}
      <path className="thinking-owl__pupil" d="M11.35 13.4 L12 15 L12.65 13.4 Z" />
    </svg>
  </span>
);

// Static brand mark for the chat top bar — same minimal single-color line
// icon as ThinkingOwl (no pulse ring, no breathing animation: this one just
// needs to read as a clean logo, not signal activity). Replaces the plain
// "Owl Bot" text title so the top bar reads as a mark instead of a label.
export const OwlMark = ({ size = 26 }: { size?: number }) => (
  <svg
    className="owl-mark"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Owl Bot"
    role="img"
  >
    {/* ear tufts */}
    <path
      className="owl-mark__line"
      d="M8.2 5.8 L6.8 2.6 M15.8 5.8 L17.2 2.6"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* head outline */}
    <path
      className="owl-mark__line"
      d="M12 4.2c-3.2 0-5.6 2.5-5.6 5.9v3c0 3.4 2.4 5.9 5.6 5.9s5.6-2.5 5.6-5.9v-3c0-3.4-2.4-5.9-5.6-5.9Z"
      strokeWidth="1.5"
    />

    {/* eyes */}
    <circle className="owl-mark__line" cx="9.3" cy="10.6" r="1.7" strokeWidth="1.4" />
    <circle className="owl-mark__line" cx="14.7" cy="10.6" r="1.7" strokeWidth="1.4" />
    <circle className="owl-mark__pupil" cx="9.3" cy="10.6" r="0.55" />
    <circle className="owl-mark__pupil" cx="14.7" cy="10.6" r="0.55" />

    {/* beak */}
    <path className="owl-mark__pupil" d="M11.35 13.4 L12 15 L12.65 13.4 Z" />
  </svg>
);
