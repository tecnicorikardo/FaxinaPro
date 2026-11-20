import React from 'react';

interface UpsideDownBinIconProps {
  className?: string;
  dumping?: boolean;
}

export const UpsideDownBinIcon: React.FC<UpsideDownBinIconProps> = ({
  className = 'w-8 h-8',
  dumping = false,
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ground surface line */}
      <line
        x1="12"
        y1="54"
        x2="52"
        y2="54"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        className="opacity-45"
      />

      {/* Falling debris specks dropping onto the ground */}
      <g className={dumping ? 'animate-bounce' : ''}>
        <rect
          x="27"
          y="45"
          width="4.5"
          height="4.5"
          rx="1"
          transform="rotate(-14 29 47)"
          fill="#F59E0B"
        />
        <rect
          x="35.5"
          y="47"
          width="4"
          height="4"
          rx="1"
          transform="rotate(20 37.5 49)"
          fill="#10B981"
        />
        <circle cx="32.5" cy="40.5" r="2" fill="#F59E0B" />
        <rect
          x="22"
          y="48"
          width="3.5"
          height="3.5"
          rx="1"
          transform="rotate(22 23.5 49.5)"
          fill="#34D399"
        />
      </g>

      {/* Upside-down trash bin tilted toward the ground */}
      <g
        transform="translate(32 25) rotate(-12) translate(-32 -25)"
        className={dumping ? 'origin-center transition-transform duration-200' : ''}
      >
        {/* Top grip (base of the bin facing upward) */}
        <line
          x1="26"
          y1="9"
          x2="38"
          y2="9"
          stroke="#10B981"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Inverted tapered bin body (narrow at top, wide open mouth at bottom) */}
        <path
          d="M21 13.5 C21 12 22.2 11 23.5 11 H40.5 C41.8 11 43 12 43 13.5 L45.5 34.5 C45.7 35.8 44.7 37 43.3 37 H20.7 C19.3 37 18.3 35.8 18.5 34.5 L21 13.5 Z"
          fill="#10B981"
          fillOpacity="0.16"
          stroke="#10B981"
          strokeWidth="2.75"
          strokeLinejoin="round"
        />

        {/* Vertical ribs */}
        <line x1="27" y1="16.5" x2="26" y2="32.5" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="32" y1="16.5" x2="32" y2="32.5" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="37" y1="16.5" x2="38" y2="32.5" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />

        {/* Bottom rim (open mouth facing down) */}
        <rect x="17" y="36" width="30" height="3.2" rx="1.6" fill="#10B981" />

        {/* Hinged lid swung open downward */}
        <g transform="translate(17.5 38.2) rotate(48)">
          <rect x="0" y="0" width="17" height="2.8" rx="1.4" fill="#34D399" />
          <line x1="6" y1="3.8" x2="11" y2="3.8" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};
