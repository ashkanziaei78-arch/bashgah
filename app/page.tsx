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
  Quote,
} from "lucide-react";
import { faNumber, faDigits } from "@/lib/format";
import { InstallPrompt } from "@/components/install-prompt";
import { Reveal } from "@/components/reveal";

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

const VOICES = [
  {
    name: "امیر ت.",
    since: "عضو از بهمن ۱۴۰۴",
    body: "قبلاً برنامه‌ام روی یک کاغذ بود که همیشه گم می‌شد. الان وزنه‌ی جلسه‌ی قبل را می‌بینم و دقیقاً می‌دانم باید چند کیلو بروم بالا.",
  },
  {
    name: "نگار م.",
    since: "عضو از آذر ۱۴۰۴",
    body: "ویدیوی هر حرکت کنار خودش هست. دیگر وسط ست دنبال کسی نمی‌گردم که بپرسم فرم درست است یا نه.",
  },
  {
    name: "سعید ک.",
    since: "عضو از مهر ۱۴۰۴",
    body: "تعداد جلسه و روز باقی‌مانده جلوی چشمم است. آخر ماه دیگر سر تمدید با پذیرش بحثی پیش نمی‌آید.",
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
              <Dumbbell className="size-5 text-white" strokeWidth={2.2} aria-hidden />
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
              <span className="fc-eyebrow fc-eyebrow-lat">Fit Club — Tehran</span>
              <h1 className="my-5 text-[clamp(2.125rem,5vw,3.25rem)] tracking-[-0.02em]">
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
              <p className="max-w-[52ch] text-lg text-fc-muted">
                برنامه تمرینی را مربی خودت می‌نویسد، ویدیوی درست هر حرکت کنارش هست، و
                کالری روزانه‌ات از روی قد، وزن و هدفت حساب می‌شود. جلسات و روزهای
                باقی‌مانده‌ات هم همیشه جلوی چشمت است.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/login" className="fc-btn">
                  <Dumbbell className="size-[18px]" aria-hidden />
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
                    <dt className="fc-figure text-3xl text-fc-text">{n}</dt>
                    <dd className="text-xs text-fc-dim">{label}</dd>
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
                      <Dumbbell className="size-[18px]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <b className="block text-sm">{name as string}</b>
                      <small className="fc-num text-xs text-fc-dim">
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
                      {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* steps — a real sequence, so it earns its numbering */}
        <section className="fc-section">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">مسیر شما</span>
              <h2 className="fc-h2 my-3">
                از ثبت‌نام تا اولین جلسه، چهار قدم
              </h2>
              <p className="fc-lede">
                هر قدم را می‌شود از داخل اپ جلو برد؛ فقط جلسه‌ی برنامه‌نویسی حضوری
                است چون مربی باید ترکیب بدنی‌ات را از نزدیک ببیند.
              </p>
            </div>
            <Reveal className="grid gap-px overflow-hidden rounded-[var(--radius-fc)] border border-[var(--fc-line)] bg-[var(--fc-line)] sm:grid-cols-2 lg:grid-cols-4">
              <ol className="contents">
              {STEPS.map((s, i) => (
                <li key={s.title} className="bg-fc-ink2 px-6 py-7">
                  <span className="fc-num mb-3 block text-2xl text-fc-cyan/35">
                    {faDigits(String(i + 1).padStart(2, "0"))}
                  </span>
                  <h3 className="mb-2 text-md">{s.title}</h3>
                  <p className="text-sm text-fc-muted">{s.body}</p>
                </li>
              ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* features */}
        <section className="fc-section">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">امکانات</span>
              <h2 className="fc-h2 mt-3">
                چیزهایی که واقعاً هر روز استفاده می‌کنی
              </h2>
            </div>
            <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="fc-card fc-card-link px-6 py-7">
                  <div className="mb-4 grid size-11 place-items-center rounded-xl border border-fc-cyan/25 bg-fc-cyan/10 text-fc-cyan">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="mb-1.5 text-md">{title}</h3>
                  <p className="text-sm text-fc-muted">{body}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* plans */}
        <section id="plans" className="fc-section">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">اشتراک‌ها</span>
              <h2 className="fc-h2 my-3">
                هر پلن، تعداد جلسه‌ی مشخص
              </h2>
              <p className="fc-lede">
                جلسه‌ها سقف ماهانه دارند و با هر ورود کم می‌شوند. جلسه‌های
                استفاده‌نشده تا پایان دوره‌ی ۳۰ روزه معتبرند.
              </p>
            </div>
            <Reveal className="grid items-start gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={
                    p.hot
                      ? "fc-card relative border-fc-cyan/45 px-6 py-7"
                      : "fc-card fc-card-link px-6 py-7"
                  }
                  style={
                    p.hot
                      ? {
                          background:
                            "linear-gradient(165deg, var(--color-fc-navy2), var(--color-fc-ink2))",
                          boxShadow:
                            "0 30px 70px -36px var(--color-fc-cyan), var(--fc-e2)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg">{p.name}</h3>
                    {p.hot && <span className="fc-chip fc-chip-cy">پرطرفدار</span>}
                  </div>
                  <div className="mt-4 mb-1 flex items-baseline gap-2">
                    <span className="fc-figure text-3xl">{faNumber(p.price)}</span>
                    <span className="text-sm font-medium text-fc-dim">تومان / ماه</span>
                  </div>
                  <p className="text-xs text-fc-dim">{p.cadence}</p>
                  <ul className="my-6 grid list-none gap-3 p-0">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2.5 text-sm text-fc-muted">
                        <Check className="mt-0.5 size-4 shrink-0 text-fc-cyan" aria-hidden />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login?mode=signup"
                    className={
                      p.hot ? "fc-btn fc-btn-block" : "fc-btn fc-btn-ghost fc-btn-block"
                    }
                  >
                    انتخاب پلن
                  </Link>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* coaches */}
        <section className="fc-section">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">مربیان</span>
              <h2 className="fc-h2 mt-3">
                برنامه را آدم می‌نویسد، نه الگوریتم
              </h2>
            </div>
            <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {COACHES.map((c) => (
                <div key={c.name} className="fc-card fc-card-link p-6 text-center">
                  <div className="fc-avatar mx-auto mb-4 size-[68px] text-lg" aria-hidden>
                    {c.initials.replace(/\s/g, "")}
                  </div>
                  <b className="block text-md">{c.name}</b>
                  <small className="text-xs text-fc-cyan">{c.field}</small>
                  <p className="mt-3 text-sm text-fc-muted">{c.bio}</p>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* social proof — the one section the first pass had no answer
            for. A prospect deciding between two Tehran gyms wants to
            hear from members, not from the gym. */}
        <section className="fc-section">
          <div className="fc-wrap">
            <div className="mb-9 max-w-[60ch]">
              <span className="fc-eyebrow">از زبان اعضا</span>
              <h2 className="fc-h2 mt-3">چیزی که واقعاً عوض شد</h2>
            </div>
            <Reveal className="grid gap-4 md:grid-cols-3">
              {VOICES.map((v) => (
                <figure key={v.name} className="fc-card grid gap-4 p-6">
                  <Quote className="size-6 text-fc-cyan/45" aria-hidden />
                  <blockquote className="text-sm leading-relaxed text-fc-muted">
                    {v.body}
                  </blockquote>
                  <figcaption className="mt-auto border-t border-[var(--fc-line)] pt-4">
                    <b className="block text-sm">{v.name}</b>
                    <small className="text-xs text-fc-dim">{v.since}</small>
                  </figcaption>
                </figure>
              ))}
            </Reveal>
          </div>
        </section>

        <section className="fc-section">
          <div className="fc-wrap">
            <InstallPrompt />
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--fc-line)] py-8">
        <div className="fc-wrap flex flex-wrap items-center gap-4 text-xs text-fc-dim">
          <span>
            <b className="text-fc-muted">Fit Club</b> — باشگاه بدنسازی
          </span>
          <span>·</span>
          <Link href="/login" className="inline-flex items-center gap-1 hover:text-fc-cyan">
            ورود اعضا <ChevronLeft className="size-3.5" aria-hidden />
          </Link>
        </div>
      </footer>
    </>
  );
}
