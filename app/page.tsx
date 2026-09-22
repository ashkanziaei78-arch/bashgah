import Link from "next/link";
import {
  Dumbbell,
  Play,
  Sparkles,
  Nfc,
  TrendingUp,
  CalendarDays,
  CreditCard,
  Check,
  ChevronLeft,
} from "lucide-react";
import { faNumber, faDigits } from "@/lib/format";
import { InstallPrompt } from "@/components/install-prompt";

const STEPS = [
  {
    title: "ثبت‌نام و انتخاب اشتراک",
    body: "با شماره موبایل وارد می‌شوی، کد پیامکی را می‌زنی و پلن ماهانه‌ات را انتخاب می‌کنی. پرداخت مستقیم داخل اپ.",
  },
  {
    title: "درخواست برنامه",
    body: "دکمه «درخواست برنامه» را می‌زنی و بین تایم‌های آزاد مربی یکی را رزرو می‌کنی.",
  },
  {
    title: "جلسه حضوری با مربی",
    body: "مربی قد، وزن و سابقه‌ات را ثبت می‌کند و همان‌جا برنامه تمرینی و غذایی را داخل پنل خودش وارد می‌کند.",
  },
  {
    title: "شروع تمرین",
    body: "برنامه لحظه‌ای روی گوشی‌ات می‌آید؛ هر حرکت ویدیو دارد و بعد از هر ست، وزنه‌ات را ثبت می‌کنی.",
  },
];

const FEATURES = [
  {
    icon: Play,
    title: "ویدیوی هر حرکت",
    body: "ادمین برای هر حرکت یک ویدیوی اجرای درست ثبت می‌کند. دیگر لازم نیست وسط ست از کسی بپرسی فرمت درست چیست.",
  },
  {
    icon: Sparkles,
    title: "کالری با محاسبه‌ی هوشمند",
    body: "مربی دانه‌دانه عدد وارد نمی‌کند. سیستم از روی قد، وزن، سن، هدف و سطح فعالیت، کالری و درشت‌مغذی‌ها را حساب می‌کند.",
  },
  {
    icon: Nfc,
    title: "ورود با کارت NFC",
    body: "کارت را روی دستگاه ورودی می‌زنی؛ یک جلسه از اشتراکت کم می‌شود و همان لحظه در پنل خودت می‌بینی.",
  },
  {
    icon: TrendingUp,
    title: "تاریخچه وزنه",
    body: "وزنه‌ی هر ست را ثبت می‌کنی تا جلسه بعد دقیقاً بدانی با چند کیلو زده‌ای و چقدر جلو رفته‌ای.",
  },
  {
    icon: CalendarDays,
    title: "تقویم شمسی",
    body: "همه‌ی تاریخ‌ها جلالی است و اعداد فارسی. رزرو تایم مربی هم روی تقویم فارسی انجام می‌شود.",
  },
  {
    icon: CreditCard,
    title: "پرداخت آنلاین",
    body: "تمدید اشتراک با درگاه ایرانی، بدون مراجعه به منشی باشگاه.",
  },
];

const PLANS = [
  {
    name: "پایه",
    price: 4000000,
    cadence: "هفته‌ای ۳ جلسه — ۱۲ جلسه در ماه",
    perks: ["دسترسی به سالن بدنسازی", "برنامه تمرینی پایه", "کتابخانه ویدیوی حرکات"],
    hot: false,
  },
  {
    name: "حرفه‌ای",
    price: 6000000,
    cadence: "هفته‌ای ۴ جلسه — ۱۶ جلسه در ماه",
    perks: [
      "همه‌ی امکانات پلن پایه",
      "برنامه اختصاصی از مربی",
      "برنامه غذایی با محاسبه‌ی هوشمند کالری",
      "ثبت و تاریخچه‌ی وزنه",
    ],
    hot: true,
  },
  {
    name: "VIP",
    price: 11000000,
    cadence: "نامحدود — ۳۰ روز",
    perks: ["ورود نامحدود", "مربی اختصاصی، هفته‌ای ۲ جلسه", "بازبینی برنامه هر ۱۴ روز"],
    hot: false,
  },
];

const COACHES = [
  { initials: "ع ر", name: "علی رضایی", field: "بدنسازی و فیتنس", bio: "۱۲ سال سابقه، مربی درجه ۱ فدراسیون. تخصص: حجم و قدرت." },
  { initials: "س م", name: "سارا محمدی", field: "فیتنس بانوان", bio: "کارشناس تربیت بدنی، ۸ سال سابقه. تخصص: کاهش وزن و فرم‌دهی." },
  { initials: "م ح", name: "محمد حسینی", field: "پاورلیفتینگ", bio: "قهرمان کشوری، مربی درجه ۲. تخصص: اسکوات، ددلیفت، پرس." },
  { initials: "ز ک", name: "زهرا کریمی", field: "تغذیه ورزشی", bio: "کارشناس ارشد تغذیه. بازبینی برنامه غذایی و ترکیب بدنی." },
];

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--fc-line)] bg-fc-ink/85 backdrop-blur-xl">
        <div className="fc-wrap flex min-h-[66px] flex-wrap items-center gap-5 py-2.5">
          <div className="me-auto flex items-center gap-2.5">
            <div
              className="grid size-[38px] shrink-0 place-items-center rounded-[11px]"
              style={{ background: "var(--fc-grad)", boxShadow: "0 6px 20px -8px var(--color-fc-cyan)" }}
            >
              <Dumbbell className="size-5 text-white" strokeWidth={2.2} />
            </div>
            <div>
              <b className="fc-lat block text-[15px] tracking-[0.14em]">Fit Club</b>
              <small className="-mt-1 block text-[11px] font-medium text-fc-dim">
                باشگاه بدنسازی
              </small>
            </div>
          </div>
          <Link href="/login" className="fc-btn fc-btn-ghost">
            ورود
          </Link>
          <Link href="/login?mode=signup" className="fc-btn">
            عضویت
          </Link>
        </div>
      </header>

      <main>
        {/* hero */}
        <section className="relative overflow-hidden pt-18 pb-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-2/5 start-[-15%] aspect-square w-[70%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-fc-cyan) 20%, transparent), transparent 62%)",
            }}
          />
          <div className="fc-wrap relative grid items-center gap-13 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="fc-eyebrow">Fit Club — Tehran</span>
              <h1 className="my-4 text-[clamp(34px,5vw,54px)] tracking-[-0.02em]">
                باشگاهی که{" "}
                <em
                  className="not-italic"
                  style={{
                    background: "linear-gradient(120deg, var(--color-fc-cyan), var(--color-fc-cyan-lift))",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  برنامه‌ات را می‌نویسد
                </em>
                ، نه فقط در را باز می‌کند.
              </h1>
              <p className="max-w-[52ch] text-[17px] text-fc-muted">
                برنامه تمرینی را مربی خودت می‌نویسد، ویدیوی درست هر حرکت کنارش هست، و
                کالری روزانه‌ات از روی قد، وزن و هدفت حساب می‌شود. جلسات و روزهای
                باقی‌مانده‌ات هم همیشه جلوی چشمت است.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className="fc-btn">
                  <Dumbbell className="size-[18px]" />
                  شروع کنید
                </Link>
                <Link href="#plans" className="fc-btn fc-btn-ghost">
                  دیدن اشتراک‌ها
                </Link>
              </div>

              <dl className="fc-num mt-11 grid grid-cols-1 border-t border-[var(--fc-line)] pt-6 sm:grid-cols-3">
                {[
                  ["۱۶", "جلسه در ماه، هفته‌ای ۴ بار"],
                  ["۲۴۰+", "ویدیوی آموزش حرکت"],
                  ["۸", "مربی رسمی فدراسیون"],
                ].map(([n, label], i) => (
                  <div
                    key={label}
                    className={
                      i > 0
                        ? "border-t border-[var(--fc-line)] pt-3.5 sm:border-t-0 sm:border-s sm:ps-5 sm:pt-0"
                        : ""
                    }
                  >
                    <dt className="fc-lat text-[30px] font-extrabold text-fc-text">{n}</dt>
                    <dd className="text-[12.5px] text-fc-dim">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* today's programme, as the hero image */}
            <div className="relative grid min-h-[380px] place-items-center">
              <div
                aria-hidden
                className="absolute size-[300px] rounded-full border border-[var(--fc-line2)]"
              />
              <div
                aria-hidden
                className="absolute size-[380px] rounded-full border border-[var(--fc-line2)] opacity-55"
              />
              <div
                className="fc-raised relative w-full max-w-[330px] p-5"
                style={{ boxShadow: "0 40px 80px -40px #000" }}
              >
                {[
                  ["پرس سینه هالتر", "۴ × ۱۰", true],
                  ["قفسه سینه دمبل", "۳ × ۱۲", true],
                  ["کراس اور سیم‌کش", "۳ × ۱۵", false],
                  ["جلوبازو هالتر", "۳ × ۱۲", false],
                ].map(([name, scheme, done], i) => (
                  <div
                    key={name as string}
                    className={`flex items-center gap-3 py-[11px] ${
                      i > 0 ? "border-t border-[var(--fc-line)]" : ""
                    }`}
                  >
                    <div className="grid size-11 shrink-0 place-items-center rounded-[11px] border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
                      <Dumbbell className="size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm">{name as string}</b>
                      <small className="fc-lat text-[11px] tracking-[0.04em] text-fc-dim">
                        {scheme as string}
                      </small>
                    </div>
                    <span
                      className={`grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                        done
                          ? "border-fc-ok bg-fc-ok text-fc-ink"
                          : "border-[var(--fc-line2)] text-fc-dim"
                      }`}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* steps — a real sequence, so it earns its numbering */}
        <section className="border-t border-[var(--fc-line)] py-16">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">مسیر شما</span>
              <h2 className="my-3 text-[clamp(25px,3.4vw,34px)] tracking-[-0.015em]">
                از ثبت‌نام تا اولین جلسه، چهار قدم
              </h2>
              <p className="text-fc-muted">
                هر قدم را می‌شود از داخل اپ جلو برد؛ فقط جلسه‌ی برنامه‌نویسی حضوری
                است چون مربی باید ترکیب بدنی‌ات را از نزدیک ببیند.
              </p>
            </div>
            <ol className="grid gap-px overflow-hidden rounded-[var(--radius-fc)] border border-[var(--fc-line)] bg-[var(--fc-line)] sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="bg-fc-ink2 px-[22px] py-[26px]">
                  <span className="fc-lat mb-3.5 block text-xs text-fc-cyan">
                    قدم {faDigits(String(i + 1).padStart(2, "0"))}
                  </span>
                  <h3 className="mb-2 text-[16.5px]">{s.title}</h3>
                  <p className="text-[13.5px] text-fc-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* features */}
        <section className="border-t border-[var(--fc-line)] py-16">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">امکانات</span>
              <h2 className="mt-3 text-[clamp(25px,3.4vw,34px)] tracking-[-0.015em]">
                چیزهایی که واقعاً هر روز استفاده می‌کنی
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="fc-card px-[22px] py-6">
                  <div className="mb-4 grid size-10 place-items-center rounded-[11px] border border-fc-cyan/25 bg-fc-cyan/10 text-fc-cyan">
                    <Icon className="size-[18px]" />
                  </div>
                  <h3 className="mb-1.5 text-base">{title}</h3>
                  <p className="text-[13.5px] text-fc-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* plans */}
        <section id="plans" className="border-t border-[var(--fc-line)] py-16">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">اشتراک‌ها</span>
              <h2 className="my-3 text-[clamp(25px,3.4vw,34px)] tracking-[-0.015em]">
                هر پلن، تعداد جلسه‌ی مشخص
              </h2>
              <p className="text-fc-muted">
                جلسه‌ها سقف ماهانه دارند و با هر ورود کم می‌شوند. جلسه‌های
                استفاده‌نشده تا پایان دوره‌ی ۳۰ روزه معتبرند.
              </p>
            </div>
            <div className="grid items-start gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={
                    p.hot
                      ? "fc-card border-fc-cyan/40 px-6 py-[26px]"
                      : "fc-card px-6 py-[26px]"
                  }
                  style={
                    p.hot
                      ? {
                          background:
                            "linear-gradient(165deg, var(--color-fc-navy2), var(--color-fc-ink2))",
                          boxShadow: "0 30px 60px -40px var(--color-fc-cyan)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-[17px]">{p.name}</h3>
                    {p.hot && <span className="fc-chip fc-chip-cy">پرطرفدار</span>}
                  </div>
                  <div className="fc-lat mt-3.5 mb-0.5 flex items-baseline gap-[7px] text-[31px] font-extrabold">
                    {faNumber(p.price)}
                    <span className="font-sans text-[13px] font-medium text-fc-dim">
                      تومان / ماه
                    </span>
                  </div>
                  <p className="text-[12.5px] text-fc-dim">{p.cadence}</p>
                  <ul className="my-5 grid list-none gap-[11px] p-0">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-[13.5px] text-fc-muted">
                        <Check className="mt-1 size-[15px] shrink-0 text-fc-cyan" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login?mode=signup"
                    className={p.hot ? "fc-btn w-full" : "fc-btn fc-btn-ghost w-full"}
                  >
                    انتخاب پلن
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* coaches */}
        <section className="border-t border-[var(--fc-line)] py-16">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">مربیان</span>
              <h2 className="mt-3 text-[clamp(25px,3.4vw,34px)] tracking-[-0.015em]">
                برنامه را آدم می‌نویسد، نه الگوریتم
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COACHES.map((c) => (
                <div key={c.name} className="fc-card p-[22px] text-center">
                  <div
                    className="fc-lat mx-auto mb-3.5 grid size-[68px] place-items-center rounded-full text-[19px] font-extrabold text-white"
                    style={{ background: "var(--fc-grad)" }}
                  >
                    {c.initials}
                  </div>
                  <b className="block text-[15px]">{c.name}</b>
                  <small className="text-[12.5px] text-fc-dim">{c.field}</small>
                  <p className="mt-2.5 text-[12.5px] text-fc-muted">{c.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--fc-line)] py-16">
          <div className="fc-wrap">
            <InstallPrompt />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--fc-line)] py-8">
        <div className="fc-wrap flex flex-wrap items-center gap-4 text-[12.5px] text-fc-dim">
          <span>
            <b className="text-fc-muted">Fit Club</b> — باشگاه بدنسازی
          </span>
          <span>·</span>
          <Link href="/login" className="inline-flex items-center gap-1 hover:text-fc-cyan">
            ورود اعضا <ChevronLeft className="size-3.5" />
          </Link>
        </div>
      </footer>
    </>
  );
}
