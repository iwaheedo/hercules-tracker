/**
 * E2E Test Account Setup Script
 *
 * Creates test coach and client accounts in Supabase for E2E testing.
 * Run once: npx tsx e2e/setup-test-accounts.ts
 *
 * After running, add these to your .env.local (and as GitHub secrets):
 *   TEST_COACH_EMAIL=waheed+e2ecoach@empasco.com
 *   TEST_COACH_PASSWORD=E2eTestCoach!123
 *   TEST_CLIENT_EMAIL=waheed+e2eclient@empasco.com
 *   TEST_CLIENT_PASSWORD=E2eTestClient!123
 *
 * NOTE: The coach test account needs to be approved by the super-admin
 * (waheed@empasco.com) via the dashboard before E2E coach tests will work.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error("Make sure .env.local is loaded (run from project root)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_ACCOUNTS = [
  {
    label: "Coach",
    email: "waheed+e2ecoach@empasco.com",
    password: "E2eTestCoach!123",
    metadata: { full_name: "E2E Test Coach", role: "coach" },
  },
  {
    label: "Client",
    email: "waheed+e2eclient@empasco.com",
    password: "E2eTestClient!123",
    metadata: { full_name: "E2E Test Client", role: "client" },
  },
];

async function setup() {
  for (const account of TEST_ACCOUNTS) {
    console.log(`\nCreating ${account.label} account (${account.email})...`);

    // Try signing in first — account may already exist
    const { data: signIn, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

    if (signIn?.user) {
      console.log(`  ✓ Already exists (ID: ${signIn.user.id})`);
      await supabase.auth.signOut();
      continue;
    }

    // Create account
    const { data, error } = await supabase.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: account.metadata },
    });

    if (error) {
      console.error(`  ✗ Failed: ${error.message}`);
      if (error.message.includes("rate limit")) {
        console.error("  → Supabase signup rate limit hit. Wait ~1 hour and try again.");
      }
    } else {
      console.log(`  ✓ Created (ID: ${data.user?.id})`);
      if (!data.user?.email_confirmed_at) {
        console.log("  ⚠ Email not confirmed — confirm in Supabase dashboard > Authentication > Users");
      }
    }
  }

  console.log("\n--- Environment variables for .env.local and GitHub secrets ---");
  console.log("TEST_COACH_EMAIL=waheed+e2ecoach@empasco.com");
  console.log("TEST_COACH_PASSWORD=E2eTestCoach!123");
  console.log("TEST_CLIENT_EMAIL=waheed+e2eclient@empasco.com");
  console.log("TEST_CLIENT_PASSWORD=E2eTestClient!123");
  console.log("PLAYWRIGHT_TEST_BASE_URL=https://app-green-omega-46.vercel.app");
}

setup().catch(console.error);
