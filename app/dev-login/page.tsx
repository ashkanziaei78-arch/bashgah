import { notFound } from "next/navigation";
import { DevLogin } from "@/components/dev-login";

export const metadata = { title: "ورود توسعه" };

/** Development-only shortcut into the demo accounts.
 *  Returns 404 in production, so it never ships. */
export default function DevLoginPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevLogin />;
}
