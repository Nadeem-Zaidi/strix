export function GlowingAiSparkle({ size = 28 }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Background Glow Effect */}
      <div
        style={{
          position: 'absolute',
          width: `${size * 0.9}px`,
          height: `${size * 0.9}px`,
          background: 'linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #EC4899 100%)',
          borderRadius: '50%',
          filter: 'blur(8px)',
          opacity: 0.5,
        }}
      />

      {/* SVG AI Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#F472B6" />
          </linearGradient>
        </defs>

        {/* Primary Star */}
        <path
          d="M10 2C10 6.418 6.418 10 2 10C6.418 10 10 13.582 10 18C10 13.582 13.582 10 18 10C13.582 10 10 6.418 10 2Z"
          fill="url(#sparkleGrad)"
        />

        {/* Top-Right Secondary Star */}
        <path
          d="M19 13C19 15.209 17.209 17 15 17C17.209 17 19 18.791 19 21C19 18.791 20.791 17 23 17C20.791 17 19 15.209 19 13Z"
          fill="url(#sparkleGrad)"
        />
      </svg>
    </div>
  );
}