import { redirect } from "next/navigation";
import { TabBar } from "@/components/tab-bar";
import { requireProfile, getSetting } from "@/lib/data";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  // Every page below queries the signed-in user's own programme, diet and
  // membership — things staff do not have — so a coach landing here would
  // see an empty panel rather than their work.
  if (profile.role !== "student") redirect("/coach");
  // The owner can switch the whole turnstile off; when they do, the tab
  // disappears rather than leading to a dead screen.
  const checkinOn = await getSetting<boolean>("checkin_module_enabled", true);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5">
        {children}
      </div>
      <TabBar showCheckin={checkinOn && profile.role === "student"} />
    </div>
  );
}
