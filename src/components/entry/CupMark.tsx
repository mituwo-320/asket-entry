export function CupMark({ className = "cup-seal" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <circle cx="60" cy="60" r="56" fill="currentColor" />
      <circle cx="60" cy="60" r="50" stroke="#30392c" strokeWidth="1" />
      <circle cx="60" cy="60" r="45" stroke="#30392c" strokeWidth=".6" strokeDasharray="1 3" />
      <path d="m35 44 20 36h11l21-36H74L61 67 48 44Z" fill="#30392c" />
      <path d="M41 85h38" stroke="#30392c" />
      <g fill="#30392c" fontFamily="sans-serif" textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="2">
        <text x="61" y="32">VANKY CUP</text><text x="61" y="99" fontSize="7" letterSpacing="1.6">PLAY TOGETHER</text>
      </g>
    </svg>
  );
}

