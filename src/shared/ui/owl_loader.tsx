// Full-screen loading owl. Same markup as the splash in index.html (its
// <style> there styles both), so the hand-off from the HTML splash to this
// one while sign-in is checked is seamless. Keep the two in sync.
export const OwlLoader = ({ label = "Loading Strix" }: { label?: string }) => (
  <div className="owl-splash" role="status" aria-label={label}>
    <div className="owl-splash__stage">
      <div className="owl-splash__orb">
        <svg className="owl-splash__owl" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="owl-splash-body" x1="32" y1="9" x2="32" y2="56" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#eaf4fb" />
                <stop offset="1" stopColor="#b9daf0" />
              </linearGradient>
            </defs>
            <path className="owl-splash__branch" d="M8 59.5h48" />
            <g className="owl-splash__bird">
              <path className="owl-splash__feet" d="M27.5 55.5v3m3-3v3m3.5-3v3m3-3v3" />
              <path className="owl-splash__tuft" d="M19 15 15.5 5.5l10 6ZM45 15l3.5-9.5-10 6Z" />
              <path className="owl-splash__body" d="M32 9C19.5 9 13 18.5 13 30v7c0 12.5 8.5 19 19 19s19-6.5 19-19v-7C51 18.5 44.5 9 32 9Z" />
              <path className="owl-splash__wing owl-splash__wing--l" d="M14.5 33c-5 6-4 15 3 19-.5-7-1-13-3-19Z" />
              <path className="owl-splash__wing owl-splash__wing--r" d="M49.5 33c5 6 4 15-3 19 .5-7 1-13 3-19Z" />
              <path className="owl-splash__belly" d="M25 44.5q3.5 2.6 7 0 3.5 2.6 7 0m-11.5 5q2.25 1.8 4.5 0 2.25 1.8 4.5 0" />
              <circle className="owl-splash__disc" cx="24" cy="27.5" r="10.5" />
              <circle className="owl-splash__disc" cx="40" cy="27.5" r="10.5" />
              <g className="owl-splash__eyes">
                <circle className="owl-splash__eye" cx="24" cy="27" r="7.5" />
                <circle className="owl-splash__eye" cx="40" cy="27" r="7.5" />
                <g className="owl-splash__pupils">
                  <circle className="owl-splash__pupil" cx="24" cy="27" r="3.4" />
                  <circle className="owl-splash__pupil" cx="40" cy="27" r="3.4" />
                  <circle className="owl-splash__shine" cx="25.2" cy="25.6" r="1.1" />
                  <circle className="owl-splash__shine" cx="41.2" cy="25.6" r="1.1" />
                </g>
              </g>
              <path className="owl-splash__beak" d="M29.6 33.5 32 38.6l2.4-5.1Z" />
            </g>
          </svg>
      </div>
      <p className="owl-splash__name">Strix</p>
      <div className="owl-splash__bar" />
    </div>
  </div>
);
