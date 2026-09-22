import { WifiOff } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "بدون اینترنت" };

export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="fc-raised max-w-[42ch] p-8 text-center">
        <WifiOff className="mx-auto mb-5 size-12 text-fc-dim" />
        <h1 className="mb-2.5 text-xl">اینترنت وصل نیست</h1>
        <p className="mb-6 text-sm text-fc-muted">
          صفحه‌هایی که قبلاً باز کرده‌اید همچنان در دسترس‌اند. برای دیدن برنامه‌ی
          جدید یا ثبت وزنه، اتصال لازم است.
        </p>
        <Link href="/" className="fc-btn">
          تلاش دوباره
        </Link>
      </div>
    </main>
  );
}
