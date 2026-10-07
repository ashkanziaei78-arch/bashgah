import { getSetting } from "@/lib/data";
import { familyOf } from "@/lib/themes";
import { ThemePicker } from "@/components/admin/theme-picker";

export const metadata = { title: "ظاهر اپ" };

export default async function Appearance() {
  const family = familyOf(await getSetting<string>("theme", "amariya"));
  return (
    <div className="pt-6 pb-10">
      <h1 className="mb-1.5 text-xl">ظاهر اپ</h1>
      <p className="mb-5 text-[13px] text-fc-muted">
        تم رنگی باشگاه را انتخاب کنید. هر تم نسخه‌ی روز و شب دارد و هر کس از پروفایل خودش روشن، تیره یا خودکار را انتخاب می‌کند.
      </p>
      <ThemePicker current={family.id} />
    </div>
  );
}
