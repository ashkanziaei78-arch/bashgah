import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GymSettings, GymUserForm } from "@/components/platform/forms";

export default async function PlatformGym({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_gyms");
  const gym = ((data ?? []) as { id: string; name: string; kind: "bodybuilding" | "crossfit"; classes_enabled: boolean; events_enabled: boolean; is_active: boolean }[]).find((g) => g.id === id);
  if (!gym) notFound();
  return (
    <div className="grid gap-5 py-5 pb-12">
      <Link href="/platform" className="inline-flex w-fit items-center gap-1 text-[12.5px] text-fc-muted hover:text-fc-cyan">
        <ChevronRight className="size-4" />همه‌ی باشگاه‌ها
      </Link>
      <h1 className="text-lg">{gym.name}</h1>
      <GymSettings gym={gym} />
      <GymUserForm gymId={gym.id} />
    </div>
  );
}
