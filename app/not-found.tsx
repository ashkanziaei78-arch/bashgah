import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "پیدا نشد" };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="fc-raised max-w-[42ch] p-8 text-center">
        <Compass className="mx-auto mb-5 size-12 text-fc-dim" />
        <h1 className="mb-2.5 text-xl">این صفحه وجود ندارد</h1>
        <p className="mb-6 text-[13.5px] text-fc-muted">
          ممکن است لینک قدیمی باشد یا آن مورد حذف شده باشد.
        </p>
        <Link href="/app" className="fc-btn">
          برگشت به خانه
        </Link>
      </div>
    </main>
  );
}
