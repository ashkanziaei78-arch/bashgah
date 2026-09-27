import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { getSetting } from "@/lib/data";
import { publicUrl } from "@/lib/storage";

export const metadata = { title: "ورود" };

export default async function LoginPage() {
  // Read from settings rather than hard-coded, so the owner can change
  // the photo behind the door without a deploy.
  const hero = await getSetting<string | null>("login_hero_path", null);
  const heroUrl = publicUrl("gym-media", hero);

  return (
    <div className="relative min-h-dvh">
      {heroUrl && (
        <>
          <Image
            src={heroUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Heavier than the card scrim: a sign-in form sits over the
              middle of the frame, where the card scrim is at its
              lightest, so the floor has to hold across the whole page. */}
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(4,16,31,.88), rgba(4,16,31,.94) 45%, rgba(4,16,31,.97))",
            }}
          />
        </>
      )}

      <div className="relative">
        {/* useSearchParams needs a boundary or the route cannot be prerendered */}
        <Suspense fallback={<div className="min-h-dvh" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
