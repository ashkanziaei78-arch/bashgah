/** The maker's mark. Quiet on purpose: it signs the work, it does not
 *  compete with the gym's own name. */
export function Credit({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11.5px] text-fc-dim ${className}`}>
      طراحی و توسعه: <b className="font-bold text-fc-muted">اشکان ضیایی</b>
      <span className="mx-1.5 opacity-60">/</span>
      <span className="fc-lat text-[10.5px] tracking-[0.12em]">AMARIYA</span>
    </p>
  );
}
