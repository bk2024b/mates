import Link from 'next/link';
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Mates accueil">
      <svg viewBox="0 0 48 40" aria-hidden="true" className="brand-mark">
        <circle className="mk-w" cx="12" cy="6" r="5" />
        <path className="mk-w" d="M5 36 14 17" />
        <circle className="mk-l" cx="33" cy="6" r="5" />
        <path className="mk-l" d="M13 36 23 15 33 36 43 15" />
      </svg>
      <span>mates</span>
    </Link>
  );
}
