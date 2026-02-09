import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { CategoryTag } from "@/components/category-tag";
import Link from "next/link";

function getCurrentWeekStart(): string {
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
  return monday.toISOString().split("T")[0];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .single();

  // Get active clients count
  const { count: clientCount } = await supabase
    .from("coach_clients")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", user!.id)
    .eq("status", "active");

  // Get all clients for this coach
  const { data: relationships } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", user!.id)
    .eq("status", "active");

  const clientIds = relationships?.map((r) => r.client_id) || [];
  const weekStart = getCurrentWeekStart();

  // Get this week's weekly goals across all clients
  let weeklyGoals: Array<{
    id: string;
    title: string;
    status: string;
    client_id: string;
    client_name: string;
    category: string | null;
  }> = [];
  let weeklyCompletion = 0;

  if (clientIds.length > 0) {
    const { data: goals } = await supabase
      .from("weekly_goals")
      .select(
        `
        id,
        title,
        status,
        client_id,
        quarterly_goal:quarterly_goals (
          goal:goals (
            category
          )
        )
      `
      )
      .in("client_id", clientIds)
      .eq("week_start", weekStart)
      .order("created_at");

    if (goals) {
      // Get client names
      const { data: clientProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", clientIds);

      const nameMap = new Map(
        clientProfiles?.map((p) => [p.id, p.full_name]) || []
      );

      weeklyGoals = goals.map((g) => {
        const qg = g.quarterly_goal as unknown as {
          goal: { category: string } | null;
        } | null;
        return {
          id: g.id,
          title: g.title,
          status: g.status,
          client_id: g.client_id,
          client_name: nameMap.get(g.client_id) || "Client",
          category: qg?.goal?.category || null,
        };
      });

      const total = weeklyGoals.length;
      const completed = weeklyGoals.filter(
        (g) => g.status === "completed"
      ).length;
      weeklyCompletion = total > 0 ? Math.round((completed / total) * 100) : 0;
    }
  }

  // Get active 3-year goals per client (for client overview)
  let clientOverview: Array<{
    id: string;
    name: string;
    goals: Array<{ id: string; title: string; category: string; status: string }>;
  }> = [];

  if (clientIds.length > 0) {
    const { data: clientProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", clientIds);

    const { data: allGoals } = await supabase
      .from("goals")
      .select("id, title, category, status, client_id")
      .in("client_id", clientIds)
      .eq("status", "active")
      .order("category");

    clientOverview = (clientProfiles || []).map((cp) => ({
      id: cp.id,
      name: cp.full_name,
      goals: (allGoals || [])
        .filter((g) => g.client_id === cp.id)
        .map((g) => ({
          id: g.id,
          title: g.title,
          category: g.category,
          status: g.status,
        })),
    }));
  }

  // Get next check-in
  const { data: nextCheckin } = await supabase
    .from("checkins")
    .select(
      `
      scheduled_at,
      client:profiles!checkins_client_id_fkey (
        full_name
      )
    `
    )
    .eq("coach_id", user!.id)
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const formatCheckinDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil(
      (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7)
      return d.toLocaleDateString("en-US", { weekday: "long" });
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-txt-900">
            {getGreeting()},{" "}
            {profile?.full_name?.split(" ")[0] ?? "Coach"}
          </h1>
          <p className="text-sm text-txt-500 mt-1">
            Here&apos;s what&apos;s happening with your clients
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <p className="text-xs font-semibold text-txt-400 uppercase tracking-wide">
              Active Clients
            </p>
            <p className="text-2xl font-bold text-txt-900 mt-1">
              {clientCount || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <p className="text-xs font-semibold text-txt-400 uppercase tracking-wide">
              Weekly Completion
            </p>
            <p className="text-2xl font-bold text-txt-900 mt-1">
              {weeklyCompletion}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <p className="text-xs font-semibold text-txt-400 uppercase tracking-wide">
              Next Check-in
            </p>
            <p className="text-2xl font-bold text-txt-900 mt-1">
              {nextCheckin
                ? formatCheckinDate(nextCheckin.scheduled_at)
                : "—"}
            </p>
            {nextCheckin && (
              <p className="text-xs text-txt-500 mt-0.5">
                with{" "}
                {(nextCheckin.client as unknown as { full_name: string })
                  ?.full_name || "Client"}
              </p>
            )}
          </div>
        </div>

        {/* This Week's Goals */}
        <div className="bg-white rounded-xl border border-surface-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-txt-900">
              This Week&apos;s Goals
            </h2>
            {weeklyGoals.length > 0 && (
              <span className="text-xs text-txt-500">
                {weeklyGoals.filter((g) => g.status === "completed").length}/
                {weeklyGoals.length} completed
              </span>
            )}
          </div>

          {weeklyGoals.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-txt-500">
                {(clientCount || 0) === 0
                  ? "Add your first client to get started."
                  : "No weekly goals set for this week."}
              </p>
              {(clientCount || 0) === 0 && (
                <Link
                  href="/clients"
                  className="inline-block mt-3 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Go to Clients →
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {weeklyGoals.map((goal) => (
                <Link
                  key={goal.id}
                  href={`/clients/${goal.client_id}?tab=weekly`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-50 transition group"
                >
                  <StatusIcon status={goal.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-txt-900 truncate">
                      {goal.title}
                    </p>
                    <p className="text-xs text-txt-500">
                      {goal.client_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {goal.category && (
                      <span className="hidden sm:inline">
                        <CategoryTag category={goal.category} />
                      </span>
                    )}
                    <StatusBadge status={goal.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Client Overview */}
        {clientOverview.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-200 p-5 mb-6">
            <h2 className="text-base font-semibold text-txt-900 mb-4">
              Client Overview
            </h2>
            <div className="space-y-4">
              {clientOverview.map((client) => (
                <div key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-2.5 mb-2 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-brand-600">
                        {client.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-txt-900 group-hover:text-brand-600 transition">
                      {client.name}
                    </p>
                    <span className="text-xs text-txt-400">
                      {client.goals.length} active goal{client.goals.length !== 1 ? "s" : ""}
                    </span>
                  </Link>
                  {client.goals.length > 0 ? (
                    <div className="ml-9 space-y-1.5">
                      {client.goals.map((goal) => (
                        <Link
                          key={goal.id}
                          href={`/clients/${client.id}?tab=3year`}
                          className="flex items-center gap-2 py-1.5 px-2.5 rounded-md hover:bg-surface-50 transition"
                        >
                          <CategoryTag category={goal.category} />
                          <p className="text-sm text-txt-700 truncate">
                            {goal.title}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="ml-9 text-xs text-txt-400">
                      No active goals yet
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link
            href="/clients"
            className="flex-1 bg-white rounded-xl border border-surface-200 p-4 hover:border-surface-300 transition text-center"
          >
            <svg
              className="w-6 h-6 text-txt-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <p className="text-sm font-medium text-txt-700">View Clients</p>
          </Link>
          <Link
            href="/settings"
            className="flex-1 bg-white rounded-xl border border-surface-200 p-4 hover:border-surface-300 transition text-center"
          >
            <svg
              className="w-6 h-6 text-txt-400 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm font-medium text-txt-700">Settings</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const configs: Record<string, { bg: string; icon: ReactNode }> = {
    completed: {
      bg: "bg-green-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    partial: {
      bg: "bg-amber-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2" />
        </svg>
      ),
    },
    missed: {
      bg: "bg-red-100",
      icon: (
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    pending: {
      bg: "bg-gray-100",
      icon: <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />,
    },
  };

  const config = configs[status] || configs.pending;

  return (
    <div
      className={`w-7 h-7 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
    >
      {config.icon}
    </div>
  );
}
