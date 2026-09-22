import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { missingSupabaseEnv } from "@/lib/env";

export const metadata = { title: "پیکربندی" };
export const dynamic = "force-dynamic";

/** Shown instead of a 500 when the deployment has no database credentials.
 *  Lists variable names only — never values — so it is safe on a public
 *  URL, and 404s once the app is configured. */
export default function Setup() {
  const missing = missingSupabaseEnv();
  if (missing.length === 0) notFound();

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="fc-raised w-full max-w-[520px] p-7">
        <div className="mb-4 flex items-center gap-3">
          <TriangleAlert className="size-7 shrink-0 text-fc-warn" />
          <h1 className="text-xl">اپ هنوز به دیتابیس وصل نیست</h1>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-fc-muted">
          این نسخه بدون تنظیمات اتصال منتشر شده، برای همین ورود و پنل‌ها کار
          نمی‌کنند. صفحه‌های عمومی سایت سالم‌اند.
        </p>

        <h2 className="mb-2 text-sm">متغیرهای تنظیم‌نشده</h2>
        <ul className="mb-5 grid list-none gap-2 p-0">
          {missing.map((name) => (
            <li
              key={name}
              className="fc-lat rounded-lg border border-[var(--fc-line2)] bg-fc-ink px-3 py-2 text-xs tracking-normal text-fc-bad"
              dir="ltr"
            >
              {name}
            </li>
          ))}
        </ul>

        <h2 className="mb-2 text-sm">راه حل</h2>
        <ol className="grid list-none gap-2.5 p-0 text-sm leading-relaxed text-fc-muted">
          <li>
            <b className="text-fc-text">۱.</b> در داشبورد میزبان، بخش متغیرهای
            محیطی پروژه را باز کنید.
          </li>
          <li>
            <b className="text-fc-text">۲.</b> مقادیر بالا را از Supabase،
            قسمت Project Settings ← API بردارید و اضافه کنید.
          </li>
          <li>
            <b className="text-fc-text">۳.</b> پروژه را دوباره منتشر کنید.
            متغیرها موقع بیلد داخل کد قرار می‌گیرند، پس انتشار دوباره لازم است.
          </li>
        </ol>

        <p className="mt-5 text-xs text-fc-dim">
          این صفحه به‌محض تکمیل تنظیمات خودش ناپدید می‌شود.
        </p>
      </div>
    </main>
  );
}
