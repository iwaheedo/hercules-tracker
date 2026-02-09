import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import {
  getQuarterlyGoals,
  getQuarterlyGoalsByGoal,
  createQuarterlyGoal,
  updateQuarterlyGoal,
  deleteQuarterlyGoal,
} from "@/app/actions/quarterly-goals";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "coach-1", email: "coach@test.com" } },
    error: null,
  });
});

describe("getQuarterlyGoals", () => {
  it("returns quarterly goals for a client", async () => {
    const mockGoals = [
      { id: "qg1", title: "Q1 Goal", goal: { id: "g1", title: "Parent", category: "fitness" } },
    ];
    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getQuarterlyGoals("client-1");

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("quarterly_goals");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getQuarterlyGoals("client-1");

    expect(result.error).toBe("Not authenticated");
  });
});

describe("getQuarterlyGoalsByGoal", () => {
  it("returns quarterly goals filtered by parent goal", async () => {
    const mockGoals = [{ id: "qg1", title: "Q1", goal_id: "g1" }];
    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getQuarterlyGoalsByGoal("g1");

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
  });
});

describe("createQuarterlyGoal", () => {
  it("creates a quarterly goal with audit log", async () => {
    const newGoal = { id: "qg-new", title: "New Q Goal" };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "quarterly_goals") return chainResult({ data: newGoal, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await createQuarterlyGoal({
      goalId: "g1",
      clientId: "client-1",
      title: "New Q Goal",
      quarterStart: "2026-01-01",
      quarterEnd: "2026-03-31",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(newGoal);
    expect(mockSupabase.from).toHaveBeenCalledWith("quarterly_goals");
    expect(mockSupabase.from).toHaveBeenCalledWith("goal_changes");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createQuarterlyGoal({
      goalId: "g1",
      clientId: "client-1",
      title: "Test",
      quarterStart: "2026-01-01",
      quarterEnd: "2026-03-31",
    });

    expect(result.error).toBe("Not authenticated");
  });
});

describe("updateQuarterlyGoal", () => {
  it("updates a quarterly goal and creates audit entry", async () => {
    const current = {
      id: "qg1",
      title: "Old Title",
      status: "active",
      client_id: "client-1",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "quarterly_goals") return chainResult({ data: current, error: null });
      if (table === "goal_changes") return chainResult({ data: null, error: null });
      return chainResult({ data: null, error: null });
    });

    const result = await updateQuarterlyGoal("qg1", { title: "New Title" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateQuarterlyGoal("nonexistent", { title: "Test" });

    expect(result.error).toBe("Quarterly goal not found");
  });
});

describe("deleteQuarterlyGoal", () => {
  it("deletes a quarterly goal and revalidates", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "quarterly_goals") {
        return chainResult({ data: { client_id: "client-1" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await deleteQuarterlyGoal("qg1");

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await deleteQuarterlyGoal("nonexistent");

    expect(result.error).toBe("Quarterly goal not found");
  });
});
