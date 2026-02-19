"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function SignupForm() {
  const searchParams = useSearchParams();

  // New secure token-based invite flow
  const token = searchParams.get("token");

  // Legacy fallback for old invite links (deprecated — will be removed)
  const legacyInviteCoachId = searchParams.get("invite");
  const legacyInviteEmail = searchParams.get("email");
  const legacyInviteName = searchParams.get("name");

  const [tokenData, setTokenData] = useState<{
    coach_id: string;
    email: string;
    name: string;
  } | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(!!token);

  // Resolved invite data (from token or legacy params)
  const inviteCoachId = tokenData?.coach_id ?? legacyInviteCoachId;
  const inviteEmail = tokenData?.email ?? legacyInviteEmail;
  const inviteName = tokenData?.name ?? legacyInviteName;
  const isInvite = !!(token || legacyInviteCoachId);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"coach" | "client">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Resolve invite token
  useEffect(() => {
    if (!token) {
      setTokenLoading(false);
      return;
    }
    supabase
      .from("invite_tokens")
      .select("coach_id, email, name")
      .eq("token", token)
      .eq("used", false)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setTokenError(true);
        } else {
          setTokenData(data);
        }
        setTokenLoading(false);
      });
  }, [token, supabase]);

  // Pre-fill form when invite data resolves
  useEffect(() => {
    if (inviteName && !fullName) setFullName(inviteName);
    if (inviteEmail && !email) setEmail(inviteEmail);
  }, [inviteName, inviteEmail, fullName, email]);

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
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Mark invite token as used
    if (token) {
      await supabase
        .from("invite_tokens")
        .update({ used: true })
        .eq("token", token);
    }

    if (authData.session) {
      // Session returned — email confirmation is off, user is signed in
      router.push("/");
      router.refresh();
    } else if (authData.user && !authData.session) {
      // User created but no session — email confirmation is required
      setNeedsConfirmation(true);
      setLoading(false);
    }
  }

  // Show loading while resolving token or checking auth
  if (tokenLoading || (isInvite && !authChecked)) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-txt-500">Loading...</p>
      </div>
    );
  }

  // Token expired or invalid
  if (token && tokenError) {
    return (
      <>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-txt-900">Invite link expired</h1>
          <p className="text-sm text-txt-500 mt-2 leading-relaxed">
            This invite link has expired or has already been used.
            <br />
            Please ask your coach to send a new invite.
          </p>
        </div>

        <Link
          href="/signup"
          className="block w-full py-2.5 px-4 bg-txt-900 text-white text-sm font-semibold rounded-lg hover:bg-txt-700 transition text-center"
        >
          Sign up without invite
        </Link>
      </>
    );
  }

  // Account created but needs email confirmation
  if (needsConfirmation) {
    return (
      <>
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-txt-900">Check your email</h1>
          <p className="text-sm text-txt-500 mt-2 leading-relaxed">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-txt-700">{email}</span>.
            <br />
            Click the link in your email to activate your account.
          </p>
        </div>

        <div className="mt-4 p-3 bg-surface-50 border border-surface-200 rounded-lg">
          <p className="text-xs text-txt-500 text-center">
            Didn&apos;t receive it? Check your spam folder, or{" "}
            <button
              onClick={() => setNeedsConfirmation(false)}
              className="text-brand-600 font-medium hover:text-brand-700"
            >
              try again
            </button>
            .
          </p>
        </div>
      </>
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
                onClick={() => setRole("client")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                  role === "client"
                    ? "bg-brand-50 border-brand-500 text-brand-600 ring-1 ring-brand-500/20"
                    : "bg-white border-surface-300 text-txt-500 hover:border-txt-400"
                }`}
              >
                Client
                <span className="block text-[11px] font-normal mt-0.5 opacity-75">
                  Track your goals
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("coach")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg border transition ${
                  role === "coach"
                    ? "bg-brand-50 border-brand-500 text-brand-600 ring-1 ring-brand-500/20"
                    : "bg-white border-surface-300 text-txt-500 hover:border-txt-400"
                }`}
              >
                Coach
                <span className="block text-[11px] font-normal mt-0.5 opacity-75">
                  Manage clients
                </span>
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
