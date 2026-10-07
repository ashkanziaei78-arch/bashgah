import { PauseCircle } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = { title: "دسترسی متوقف شده" };

/** Where everyone from a deactivated gym lands. Deliberately does not
 *  call requireProfile — that is what sends them here. */
export default function Suspended() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="fc-raised max-w-[42ch] p-8 text-center">
        <PauseCircle className="mx-auto mb-5 size-12 text-fc-dim" />
        <h1 className="mb-2.5 text-xl">حساب باشگاه موقتاً غیرفعال است</h1>
        <p className="mb-6 text-[13.5px] leading-relaxed text-fc-muted">
          اطلاعات شما محفوظ است. برای فعال‌سازی دوباره با مدیر باشگاه تماس بگیرید.
        </p>
        <SignOutButton />
      </div>
    </main>
  );
}
