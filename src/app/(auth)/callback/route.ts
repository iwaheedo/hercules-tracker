import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check user role and redirect accordingly
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, approved")
          .eq("id", user.id)
          .single();

        if (profile?.role === "client") {
          return NextResponse.redirect(`${origin}/portal`);
        }
        if (profile?.role === "coach" && !profile?.approved) {
          return NextResponse.redirect(`${origin}/pending-approval`);
        }
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      // User authenticated but no profile found — send to root for role routing
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
