import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { AddClientForm } from "./add-client-form";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get all linked clients
  const { data: relationships } = await supabase
    .from("coach_clients")
    .select(
      `
      id,
      status,
      created_at,
      client_id,
      client:profiles!coach_clients_client_id_fkey (
        id,
        full_name,
        phone,
        avatar_url,
        created_at
      )
    `
    )
    .eq("coach_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Get goal stats per client
  const clients = await Promise.all(
    (relationships || []).map(async (rel) => {
      const client = rel.client as unknown as {
        id: string;
        full_name: string;
        phone: string | null;
        avatar_url: string | null;
        created_at: string;
      };

      const { count: goalsCount } = await supabase
        .from("goals")
        .select("*", { count: "exact", head: true })
        .eq("client_id", client.id)
        .eq("status", "active");

      // This week's weekly goals
      const today = new Date();
      const day = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + (day === 0 ? -6 : 1));
      const weekStart = monday.toISOString().split("T")[0];

      const { data: weeklyGoals } = await supabase
        .from("weekly_goals")
        .select("status")
        .eq("client_id", client.id)
        .eq("week_start", weekStart);

      const total = weeklyGoals?.length || 0;
      const completed =
        weeklyGoals?.filter((g) => g.status === "completed").length || 0;
      const weeklyCompletion =
        total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        ...client,
        active_goals: goalsCount || 0,
        weekly_completion: weeklyCompletion,
        weekly_total: total,
        weekly_completed: completed,
      };
    })
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-txt-900">Clients</h1>
            <p className="text-sm text-txt-500 mt-0.5">
              {clients.length} active client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <AddClientForm />
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={
              <svg
                className="w-6 h-6 text-brand-500"
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
            }
            title="No clients yet"
            description="Invite your first client to start tracking their goals. Click 'Add Client' to generate a sign-up link."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-xl border border-surface-200 p-5 hover:border-surface-300 hover:shadow-sm transition group"
              >
                {/* Avatar + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-brand-600">
                      {client.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-txt-900 truncate group-hover:text-brand-600 transition">
                      {client.full_name}
                    </p>
                    <p className="text-xs text-txt-500">
                      Member since{" "}
                      {new Date(client.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-center">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-txt-900">
                      {client.active_goals}
                    </p>
                    <p className="text-[11px] text-txt-500">Goals</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-txt-900">
                      {client.weekly_completion}%
                    </p>
                    <p className="text-[11px] text-txt-500">This Week</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-txt-900">
                      {client.weekly_completed}/{client.weekly_total}
                    </p>
                    <p className="text-[11px] text-txt-500">Completed</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
