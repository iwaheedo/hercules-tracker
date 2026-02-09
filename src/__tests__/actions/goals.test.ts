import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

// Mock the Supabase server module
const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import {
  getGoalsByClient,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/app/actions/goals";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset default: authenticated user
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "coach-1", email: "coach@test.com" } },
    error: null,
  });
});

describe("getGoalsByClient", () => {
  it("returns goals for a client", async () => {
    const mockGoals = [
      { id: "g1", title: "Goal 1", category: "fitness", client_id: "client-1" },
      { id: "g2", title: "Goal 2", category: "professional", client_id: "client-1" },
    ];

    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getGoalsByClient("client-1");

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("goals");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getGoalsByClient("client-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when Supabase query fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "DB error" } })
    );

    const result = await getGoalsByClient("client-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe("DB error");
  });
});

describe("createGoal", () => {
  it("creates a goal and returns it", async () => {
    const newGoal = { id: "g-new", title: "New Goal", category: "fitness" };

    // First call: from("goals").insert()...single() → returns the new goal
    // Second call: from("goal_changes").insert() → audit log
    let callCount = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callCount++;
      if (table === "goals") {
        return chainResult({ data: newGoal, error: null });
      }
      if (table === "goal_changes") {
        return chainResult({ data: null, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await createGoal({
      clientId: "client-1",
      title: "New Goal",
      category: "fitness",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(newGoal);
    expect(mockSupabase.from).toHaveBeenCalledWith("goals");
    expect(mockSupabase.from).toHaveBeenCalledWith("goal_changes");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await createGoal({
      clientId: "client-1",
      title: "Test",
      category: "fitness",
    });

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when insert fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "Insert failed" } })
    );

    const result = await createGoal({
      clientId: "client-1",
      title: "Test",
      category: "fitness",
    });

    expect(result.error).toBe("Insert failed");
  });

  it("looks up coach when client creates their own goal", async () => {
    // User is the client themselves
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "client-1", email: "client@test.com" } },
      error: null,
    });

    const newGoal = { id: "g-new", title: "My Goal" };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "coach_clients") {
        return chainResult({ data: { coach_id: "coach-1" }, error: null });
      }
      if (table === "goals") {
        return chainResult({ data: newGoal, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await createGoal({
      clientId: "client-1", // same as user.id
      title: "My Goal",
      category: "fitness",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("coach_clients");
  });
});

describe("updateGoal", () => {
  it("updates a goal and creates audit entry", async () => {
    const currentGoal = {
      id: "g1",
      title: "Old Title",
      status: "active",
      client_id: "client-1",
      category: "fitness",
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "goals") {
        return chainResult({ data: currentGoal, error: null });
      }
      if (table === "goal_changes") {
        return chainResult({ data: null, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await updateGoal("g1", { title: "New Title" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateGoal("nonexistent", { title: "Test" });

    expect(result.error).toBe("Goal not found");
  });
});

describe("deleteGoal", () => {
  it("deletes a goal and revalidates paths", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "goals") {
        return chainResult({ data: { client_id: "client-1", title: "Deleted Goal" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await deleteGoal("g1");

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await deleteGoal("nonexistent");

    expect(result.error).toBe("Goal not found");
  });
});
