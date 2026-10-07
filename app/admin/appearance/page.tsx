import { getSetting } from "@/lib/data";
import { themeOf } from "@/lib/themes";
import { ThemePicker } from "@/components/admin/theme-picker";

export const metadata = { title: "ظاهر اپ" };

export default async function Appearance() {
  const theme = themeOf(await getSetting<string>("theme", "amariya"));
  return (
    <div className="pt-6 pb-10">
      <h1 className="mb-1.5 text-xl">ظاهر اپ</h1>
      <p className="mb-5 text-[13px] text-fc-muted">
        تم رنگی باشگاه را انتخاب کنید. همه‌ی اعضا، مربی‌ها و صفحه‌ی ورود با همین تم دیده می‌شوند.
      </p>
      <ThemePicker current={theme.id} />
    </div>
  );
}
