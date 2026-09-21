import { TabBar } from "@/components/tab-bar";
import { requireProfile, getSetting } from "@/lib/data";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  // The owner can switch the whole turnstile off; when they do, the tab
  // disappears rather than leading to a dead screen.
  const checkinOn = await getSetting<boolean>("checkin_module_enabled", true);

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5">
        {children}
      </div>
      <TabBar role={profile.role} showCheckin={checkinOn} />
    </div>
  );
}
