"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteCoachId = searchParams.get("invite");
  const inviteEmail = searchParams.get("email");
  const inviteName = searchParams.get("name");
  const isInvite = !!inviteCoachId;

  const [fullName, setFullName] = useState(inviteName || "");
  const [email, setEmail] = useState(inviteEmail || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"coach" | "client">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Check if user is already logged in (coach testing the invite link)
  useEffect(() => {
    if (!isInvite) {
      setAuthChecked(true);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
      }
      setAuthChecked(true);
    });
  }, [supabase, isInvite]);

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSigningOut(false);
    router.refresh();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Build user metadata — include invite_coach_id if coming from an invite
    const metadata: Record<string, string> = {
      full_name: fullName,
      role: role,
    };

    if (isInvite && inviteCoachId) {
      metadata.invite_coach_id = inviteCoachId;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      router.push("/");
      router.refresh();
    }
  }

  // Show loading while checking auth state for invite links
  if (isInvite && !authChecked) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-txt-500">Loading...</p>
      </div>
    );
  }

  // If logged in and viewing an invite link, show sign-out prompt
  if (isLoggedIn && isInvite) {
    return (
      <>
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold text-txt-900">Already signed in</h1>
          <p className="text-sm text-txt-500 mt-1">
            You&apos;re currently logged in. Sign out first to create the client
            account for{" "}
            <span className="font-medium text-txt-700">
              {inviteName || inviteEmail}
            </span>
            .
          </p>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full py-2.5 px-4 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition disabled:opacity-50"
        >
          {signingOut ? "Signing out..." : "Sign out & continue"}
        </button>

        <div className="mt-3 p-3 bg-surface-50 border border-surface-200 rounded-lg">
          <p className="text-xs text-txt-500 text-center">
            Or share this link with your client to let them sign up directly.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-txt-900">
          {isInvite ? "Welcome aboard!" : "Create account"}
        </h1>
        <p className="text-sm text-txt-500 mt-1">
          {isInvite
            ? "Your coach has invited you to Hercules"
            : "Get started with Hercules"}
        </p>
      </div>

      {/* Invite badge */}
      {isInvite && (
        <div className="bg-brand-50 border border-brand-200 rounded-lg px-3.5 py-2.5 mb-5">
          <p className="text-sm text-brand-700">
            <span className="font-medium">Invited as a client</span> — create
            your account to get started with goal tracking.
          </p>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Role selector — hidden when coming from invite */}
        {!isInvite && (
          <div>
            <label className="text-sm font-medium text-txt-700 mb-2 block">
              I am a
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("coach")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                  role === "coach"
                    ? "bg-brand-50 border-brand-500 text-brand-600"
                    : "bg-white border-surface-300 text-txt-500 hover:border-txt-400"
                }`}
              >
                Coach
              </button>
              <button
                type="button"
                onClick={() => setRole("client")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                  role === "client"
                    ? "bg-brand-50 border-brand-500 text-brand-600"
                    : "bg-white border-surface-300 text-txt-500 hover:border-txt-400"
                }`}
              >
                Client
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-txt-700 mb-1.5 block">
            Full name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
            className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900 placeholder:text-txt-400"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-txt-700 mb-1.5 block">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            readOnly={isInvite && !!inviteEmail}
            className={`w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-txt-900 placeholder:text-txt-400 ${
              isInvite && inviteEmail
                ? "bg-surface-50 cursor-not-allowed"
                : "bg-white"
            }`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-txt-700 mb-1.5 block">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-txt-900 placeholder:text-txt-400"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3.5 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </>
  );
}

function SignupFormFallback() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-txt-900">Create account</h1>
        <p className="text-sm text-txt-500 mt-1">
          Get started with Hercules
        </p>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-surface-100 rounded-lg animate-pulse" />
        <div className="h-10 bg-surface-100 rounded-lg animate-pulse" />
        <div className="h-10 bg-surface-100 rounded-lg animate-pulse" />
        <div className="h-10 bg-surface-100 rounded-lg animate-pulse" />
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-txt-900 flex items-center justify-center">
            <svg
              className="w-4.5 h-4.5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-txt-900 tracking-tight">
            Hercules
          </span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-8">
          <Suspense fallback={<SignupFormFallback />}>
            <SignupForm />
          </Suspense>
        </div>

        <p className="text-center text-sm text-txt-500 mt-5">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-brand-600 font-medium hover:text-brand-700"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
