import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import {
  getWeeklyGoals,
  getWeeklyGoalsAllClients,
  createWeeklyGoal,
  updateWeeklyGoal,
  updateWeeklyGoalStatus,
  deleteWeeklyGoal,
} from "@/app/actions/weekly-goals";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "coach-1", email: "coach@test.com" } },
    error: null,
  });
});

describe("getWeeklyGoals", () => {
  it("returns weekly goals for a client and week", async () => {
    const mockGoals = [
      { id: "wg1", title: "Exercise", status: "pending", week_start: "2026-02-09" },
    ];
    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getWeeklyGoals("client-1", "2026-02-09");

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_goals");
  });

  it("defaults to current week when weekStart is omitted", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: [], error: null }));

    const result = await getWeeklyGoals("client-1");

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getWeeklyGoals("client-1");

    expect(result.error).toBe("Not authenticated");
  });
});

describe("getWeeklyGoalsAllClients", () => {
  it("returns empty array when coach has no clients", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: [], error: null }));

    const result = await getWeeklyGoalsAllClients();

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getWeeklyGoalsAllClients();

    expect(result.error).toBe("Not authenticated");
  });
});

describe("createWeeklyGoal", () => {
  it("creates a weekly goal with audit log", async () => {
    const newGoal = { id: "wg-new", title: "New Weekly" };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: newGoal, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await createWeeklyGoal({
      quarterlyGoalId: "qg1",
      clientId: "client-1",
      title: "New Weekly",
      weekStart: "2026-02-09",
      weekEnd: "2026-02-15",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(newGoal);
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_goals");
    expect(mockSupabase.from).toHaveBeenCalledWith("goal_changes");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createWeeklyGoal({
      quarterlyGoalId: "qg1",
      clientId: "client-1",
      title: "Test",
      weekStart: "2026-02-09",
      weekEnd: "2026-02-15",
    });

    expect(result.error).toBe("Not authenticated");
  });
});

describe("updateWeeklyGoal", () => {
  it("updates a weekly goal and creates audit entries", async () => {
    const current = {
      id: "wg1",
      title: "Old",
      status: "pending",
      coach_notes: null,
      client_notes: null,
      client_id: "client-1",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: current, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await updateWeeklyGoal("wg1", { status: "completed" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateWeeklyGoal("nonexistent", { status: "completed" });

    expect(result.error).toBe("Weekly goal not found");
  });
});

describe("updateWeeklyGoalStatus", () => {
  it("delegates to updateWeeklyGoal with status and clientNotes", async () => {
    const current = {
      id: "wg1",
      status: "pending",
      client_notes: null,
      client_id: "client-1",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: current, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await updateWeeklyGoalStatus("wg1", "completed", "Finished!");

    expect(result.error).toBeNull();
  });
});

describe("deleteWeeklyGoal", () => {
  it("deletes a weekly goal and revalidates", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") {
        return chainResult({ data: { client_id: "client-1" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await deleteWeeklyGoal("wg1");

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await deleteWeeklyGoal("nonexistent");

    expect(result.error).toBe("Weekly goal not found");
  });
});
