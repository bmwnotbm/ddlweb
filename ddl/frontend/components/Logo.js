/**
 * โลโก้: แคปซูลยาแบ่งครึ่งดำ-ขาว เป็นสัญลักษณ์ขั้นต่ำสุดของ "ร้านขายยา"
 * ใช้เป็น mark เดี่ยว (mark only) หรือคู่กับ wordmark ก็ได้
 */
export function LogoMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="14" width="38" height="12" rx="6" stroke="#0B0B0A" strokeWidth="1.5" />
      <path d="M20 14V26" stroke="#0B0B0A" strokeWidth="1.5" />
      <path d="M1.5 20H19.3" stroke="#0B0B0A" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ withWordmark = true, size = 32 }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {withWordmark && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-xl font-semibold tracking-[0.1em] text-ink">
            DRUG DEALER
          </span>
          <span className="mt-0.5 font-mono text-[11px] tracking-[0.14em] text-muted">
            ONLINE APOTHECARY
          </span>
        </span>
      )}
    </span>
  );
}
