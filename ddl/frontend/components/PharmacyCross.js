export default function PharmacyCross({ size = 28, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="1" y="1" width="22" height="22" rx="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
