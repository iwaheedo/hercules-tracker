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

const COACH_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const GOAL_1_ID = "33333333-3333-3333-3333-333333333333";
const GOAL_2_ID = "33333333-3333-3333-3333-333333333334";
const NONEXISTENT_ID = "99999999-9999-9999-9999-999999999999";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset default: authenticated user
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: COACH_ID, email: "coach@test.com" } },
    error: null,
  });
});

describe("getGoalsByClient", () => {
  it("returns goals for a client", async () => {
    const mockGoals = [
      { id: GOAL_1_ID, title: "Goal 1", category: "fitness", client_id: CLIENT_ID },
      { id: GOAL_2_ID, title: "Goal 2", category: "professional", client_id: CLIENT_ID },
    ];

    mockSupabase.from.mockReturnValue(chainResult({ data: mockGoals, error: null }));

    const result = await getGoalsByClient(CLIENT_ID);

    expect(result.data).toEqual(mockGoals);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("goals");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getGoalsByClient(CLIENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when Supabase query fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "DB error" } })
    );

    const result = await getGoalsByClient(CLIENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe("DB error");
  });
});

describe("createGoal", () => {
  it("creates a goal and returns it", async () => {
    const newGoal = { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", title: "New Goal", category: "fitness" };

    // First call: from("goals").insert()...single() -> returns the new goal
    // Second call: from("goal_changes").insert() -> audit log
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
      clientId: CLIENT_ID,
      title: "New Goal",
      category: "fitness",
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(newGoal);
    expect(mockSupabase.from).toHaveBeenCalledWith("goals");
    expect(mockSupabase.from).toHaveBeenCalledWith("goal_changes");
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await createGoal({
      clientId: CLIENT_ID,
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
      clientId: CLIENT_ID,
      title: "Test",
      category: "fitness",
    });

    expect(result.error).toBe("Insert failed");
  });

  it("looks up coach when client creates their own goal", async () => {
    // User is the client themselves
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: CLIENT_ID, email: "client@test.com" } },
      error: null,
    });

    const newGoal = { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", title: "My Goal" };
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "coach_clients") {
        return chainResult({ data: { coach_id: COACH_ID }, error: null });
      }
      if (table === "goals") {
        return chainResult({ data: newGoal, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await createGoal({
      clientId: CLIENT_ID, // same as user.id
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
      id: GOAL_1_ID,
      title: "Old Title",
      status: "active",
      client_id: CLIENT_ID,
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

    const result = await updateGoal(GOAL_1_ID, { title: "New Title" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateGoal(NONEXISTENT_ID, { title: "Test" });

    expect(result.error).toBe("Goal not found");
  });
});

describe("deleteGoal", () => {
  it("deletes a goal and revalidates paths", async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "goals") {
        return chainResult({ data: { client_id: CLIENT_ID, title: "Deleted Goal" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await deleteGoal(GOAL_1_ID);

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("returns error when goal not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await deleteGoal(NONEXISTENT_ID);

    expect(result.error).toBe("Goal not found");
  });
});
