/** What a screen looks like while its data is on the way: the same
 *  blocks the page will have, so nothing shifts when it lands. Most
 *  members open the app on mobile data, where the wait is real. */
export function PageSkeleton({ variant = "app" }: { variant?: "app" | "panel" }) {
  if (variant === "panel") {
    return (
      <div className="grid gap-3 pt-6 pb-10" aria-busy="true" aria-label="در حال بارگذاری">
        <div className="fc-skel h-7 w-40" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="fc-skel h-20" />
          ))}
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="fc-skel h-16" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-3.5 pt-5 pb-10" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="flex items-center gap-3">
        <div className="fc-skel size-[38px] rounded-full" />
        <div className="grid flex-1 gap-1.5">
          <div className="fc-skel h-3 w-24" />
          <div className="fc-skel h-4 w-40" />
        </div>
      </div>
      <div className="fc-skel aspect-[16/8] w-full rounded-[22px]" />
      <div className="grid grid-cols-3 gap-2.5">
        <div className="fc-skel h-16" />
        <div className="fc-skel h-16" />
        <div className="fc-skel h-16" />
      </div>
      <div className="fc-skel h-20" />
      <div className="fc-skel h-20" />
    </div>
  );
}
