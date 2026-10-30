import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Mates accueil">
      <svg viewBox="0 0 42 42" aria-hidden="true">
        <rect width="42" height="42" rx="13" fill="currentColor" />
        <path
          d="M10 29V17c0-6 11-6 11 0v12M21 17c0-6 11-6 11 0v12"
          fill="none"
          stroke="#17251a"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        mates<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
