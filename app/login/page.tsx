import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    // useSearchParams needs a boundary or the route cannot be prerendered
    <Suspense fallback={<div className="min-h-dvh" />}>
      <LoginForm />
    </Suspense>
  );
}
