export function AcrylicBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
      {/* Precision Dot Matrix Grid */}
      <svg
        className="absolute inset-0 w-full h-full text-slate-400/35 dark:text-slate-600/30"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="acrylic-dot-grid"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#acrylic-dot-grid)" />
      </svg>

      {/* Topographic Biometric Vector Contours (Refracted through Glass) */}
      <svg
        className="absolute inset-0 w-full h-full text-slate-400/30 dark:text-slate-500/20"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Curving Elevation Contours */}
        <path
          d="M-100 220 C 300 120, 600 340, 1000 200 C 1200 120, 1400 260, 1600 180"
          stroke="currentColor"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-100 280 C 300 180, 600 400, 1000 260 C 1200 180, 1400 320, 1600 240"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-100 340 C 300 240, 600 460, 1000 320 C 1200 240, 1400 380, 1600 300"
          stroke="currentColor"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d="M-100 620 C 250 520, 550 720, 950 580 C 1150 500, 1350 640, 1600 560"
          stroke="currentColor"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-100 680 C 250 580, 550 780, 950 640 C 1150 560, 1350 700, 1600 620"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M-100 740 C 250 640, 550 840, 950 700 C 1150 620, 1350 760, 1600 680"
          stroke="currentColor"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />

        {/* Diagonal Architectural Geometry Lines */}
        <line
          x1="-200"
          y1="100"
          x2="1700"
          y2="750"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 12"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="-200"
          y1="300"
          x2="1700"
          y2="950"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="8 12"
          vectorEffect="non-scaling-stroke"
        />

        {/* Precision Registration Crosshairs (+) */}
        {[
          { x: 180, y: 140 },
          { x: 640, y: 120 },
          { x: 1180, y: 160 },
          { x: 320, y: 460 },
          { x: 820, y: 440 },
          { x: 1320, y: 480 },
          { x: 220, y: 780 },
          { x: 740, y: 820 },
          { x: 1240, y: 760 },
        ].map((pt, i) => (
          <g key={i} stroke="currentColor" strokeWidth="1.5">
            <line x1={pt.x - 7} y1={pt.y} x2={pt.x + 7} y2={pt.y} />
            <line x1={pt.x} y1={pt.y - 7} x2={pt.x} y2={pt.y + 7} />
          </g>
        ))}
      </svg>
    </div>
  );
}

