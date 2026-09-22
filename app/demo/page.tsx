import { DemoApp } from "@/components/demo-app";

export const metadata = {
  title: "نسخه نمایشی",
  description:
    "اپ Fit Club را بدون ثبت‌نام ببینید — برنامه تمرینی، تایمر استراحت، نمودار پیشرفت و برنامه غذایی.",
};

/** A public walkthrough of the member app.
 *
 *  Unlike /dev-login this ships to production on purpose: it is what a
 *  prospective member is sent when they ask "what does it actually look
 *  like", and answering that with a login wall loses them. */
export default function DemoPage() {
  return <DemoApp />;
}
