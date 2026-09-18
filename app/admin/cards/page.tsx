import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/data";
import { CardRegister, type CardRow, type StudentOption } from "@/components/admin/card-register";

export const metadata = { title: "کارت‌ها" };

export default async function AdminCards() {
  const supabase = await createClient();
  const checkinOn = await getSetting<boolean>("checkin_module_enabled", true);

  const [{ data: cards }, { data: students }] = await Promise.all([
    supabase
      .from("cards")
      .select(
        `id, uid, label, active, issued_at,
         student:profiles!cards_student_id_fkey(id, full_name)`
      )
      .order("issued_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "student").order("full_name"),
  ]);

  const rows: CardRow[] = (
    (cards ?? []) as {
      id: string;
      uid: string;
      label: string | null;
      active: boolean;
      issued_at: string;
      student: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
    }[]
  ).map((card) => {
    const student = Array.isArray(card.student) ? card.student[0] : card.student;
    return {
      id: card.id,
      uid: card.uid,
      label: card.label,
      active: card.active,
      issuedAt: card.issued_at,
      studentName: student?.full_name ?? "بدون نام",
    };
  });

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">کارت‌های ورود</h1>
        <p className="text-xs text-fc-muted">
          هر کارت به یک عضو بسته است. کارت گم‌شده را غیرفعال کنید، حذف نکنید.
        </p>
      </header>

      {!checkinOn && (
        <p className="fc-card mb-3.5 border-fc-warn/35 p-3.5 text-[12.5px] leading-relaxed text-fc-warn">
          ماژول ورود با کارت خاموش است، پس هیچ تپی ثبت نمی‌شود. از «نمای کلی»
          روشنش کنید.
        </p>
      )}

      <CardRegister rows={rows} students={(students ?? []) as StudentOption[]} />
      <div className="h-6" />
    </>
  );
}
