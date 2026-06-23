interface Props {
  tiltDeg: number;
  balanced: boolean;
}

// Decorative balance frame. Pointer-events are disabled so the HTML pans layered
// on top receive all drag interactions.
export function Beam({ tiltDeg, balanced }: Props) {
  return (
    <svg viewBox="0 0 400 170" className="absolute inset-0 w-full h-full pointer-events-none">
      {/* base + fulcrum stand (apex points up to the pivot) */}
      <rect x="150" y="150" width="100" height="8" rx="4" fill="#312e81" />
      <polygon points="200,64 172,152 228,152" fill="#4f46e5" />

      {/* rotating beam */}
      <g
        style={{
          transform: `rotate(${tiltDeg}deg)`,
          transformOrigin: '200px 60px',
          transition: 'transform 90ms linear',
        }}
      >
        <rect x="44" y="55" width="312" height="10" rx="5" fill="#818cf8" />
        <line x1="60" y1="62" x2="60" y2="96" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.6" />
        <line x1="340" y1="62" x2="340" y2="96" stroke="#818cf8" strokeWidth="2" strokeOpacity="0.6" />
        <circle cx="200" cy="60" r="7" fill={balanced ? '#10b981' : '#f59e0b'} />
      </g>
    </svg>
  );
}
