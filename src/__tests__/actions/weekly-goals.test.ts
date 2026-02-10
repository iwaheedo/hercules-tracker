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

const COACH_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const WEEKLY_GOAL_ID = "55555555-5555-5555-5555-555555555555";
const QUARTERLY_GOAL_ID = "66666666-6666-6666-6666-666666666666";
const NONEXISTENT_ID = "99999999-9999-9999-9999-999999999999";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: COACH_ID, email: "coach@test.com" } },
    error: null,
  });
});

describe("getWeeklyGoals", () => {
  it("returns weekly goals for a client and week", async () => {
    const mockGoals = [
      { id: WEEKLY_GOAL_ID, title: "Exercise", status: "pending", week_start: "2026-02-09" },
    ];
    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getWeeklyGoals(CLIENT_ID, "2026-02-09");

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_goals");
  });

  it("defaults to current week when weekStart is omitted", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: [], error: null }));

    const result = await getWeeklyGoals(CLIENT_ID);

    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getWeeklyGoals(CLIENT_ID);

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
    const newGoal = { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", title: "New Weekly" };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: newGoal, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await createWeeklyGoal({
      quarterlyGoalId: QUARTERLY_GOAL_ID,
      clientId: CLIENT_ID,
      title: "New Weekly",
      weekStart: "2026-02-09",
      weekEnd: "2026-02-15",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(newGoal);
    expect(mockSupabase.from).toHaveBeenCalledWith("weekly_goals");
    expect(mockSupabase.from).toHaveBeenCalledWith("goal_changes");
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createWeeklyGoal({
      quarterlyGoalId: QUARTERLY_GOAL_ID,
      clientId: CLIENT_ID,
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
      id: WEEKLY_GOAL_ID,
      title: "Old",
      status: "pending",
      coach_notes: null,
      client_notes: null,
      client_id: CLIENT_ID,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: current, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await updateWeeklyGoal(WEEKLY_GOAL_ID, { status: "completed" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateWeeklyGoal(NONEXISTENT_ID, { status: "completed" });

    expect(result.error).toBe("Weekly goal not found");
  });
});

describe("updateWeeklyGoalStatus", () => {
  it("delegates to updateWeeklyGoal with status and clientNotes", async () => {
    const current = {
      id: WEEKLY_GOAL_ID,
      status: "pending",
      client_notes: null,
      client_id: CLIENT_ID,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") return chainResult({ data: current, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await updateWeeklyGoalStatus(WEEKLY_GOAL_ID, "completed", "Finished!");

    expect(result.error).toBeNull();
  });
});

describe("deleteWeeklyGoal", () => {
  it("deletes a weekly goal and revalidates", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "weekly_goals") {
        return chainResult({ data: { client_id: CLIENT_ID }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await deleteWeeklyGoal(WEEKLY_GOAL_ID);

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await deleteWeeklyGoal(NONEXISTENT_ID);

    expect(result.error).toBe("Weekly goal not found");
  });
});
