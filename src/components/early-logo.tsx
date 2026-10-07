/** The approved Inner Circle mark, drawn as vectors for small screens and print. */
export function EarlyLogo({ className = "", symbolOnly = false }: { className?: string; symbolOnly?: boolean }) {
  return (
    <svg className={`early-logo ${className}`} viewBox={symbolOnly ? "0 0 100 100" : "0 0 304 100"} fill="none" aria-hidden="true" focusable="false">
      <path d="M66 13.34A40 40 0 1 0 86.8 34.3" stroke="currentColor" strokeWidth="12.5" />
      <path d="M11 44H49Q59 44 59 55H11Z" fill="currentColor" />
      <circle cx="80" cy="19" r="10.8" fill="#FF785F" />
      {!symbolOnly && <g stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M146 22H117V78H146M117 50H141" />
        <circle cx="174" cy="58" r="20" />
        <path d="M194 38V78M211 78V39M211 53Q216 38 229 38M242 22V72Q242 78 248 78M262 39L276 70M290 39L268 92" />
      </g>}
    </svg>
  );
}
