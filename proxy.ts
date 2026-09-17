import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/env";

/** Runs before every route. Refreshes the Supabase session cookie on every request so Server
 *  Components always read a live session. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = supabaseEnv();

  // Deployed without credentials: the marketing pages still work, but
  // anything behind sign-in would throw deep in the Supabase client and
  // surface as a bare 500. Send it somewhere that explains itself.
  if (!env) {
    if (request.nextUrl.pathname.startsWith("/app") ||
        request.nextUrl.pathname.startsWith("/login")) {
      const setup = request.nextUrl.clone();
      setup.pathname = "/setup";
      setup.search = "";
      return NextResponse.redirect(setup);
    }
    return response;
  }

  const { url, key } = env;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Everything under /app needs a signed-in user.
  if (!user && request.nextUrl.pathname.startsWith("/app")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|sw.js|manifest.webmanifest|favicon.ico).*)"],
};
