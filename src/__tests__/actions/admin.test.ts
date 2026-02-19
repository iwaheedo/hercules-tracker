import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import { getPendingCoaches, approveCoach } from "@/app/actions/admin";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  // Set the env var the admin module now reads
  process.env.SUPER_COACH_EMAIL = "waheed@empasco.com";
  // Default: authenticated as the super-admin
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "super-1", email: "waheed@empasco.com" } },
    error: null,
  });
});

describe("getPendingCoaches", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await getPendingCoaches();
    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeNull();
  });

  it("returns error when not the super-admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "other-1", email: "other@test.com" } },
      error: null,
    });
    const result = await getPendingCoaches();
    expect(result.error).toBe("Not authorized");
    expect(result.data).toBeNull();
  });

  it("returns pending coaches for the super-admin", async () => {
    const coaches = [
      {
        id: "c1",
        full_name: "New Coach",
        email: "new@test.com",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    mockSupabase.from.mockReturnValue(
      chainResult({ data: coaches, error: null })
    );

    const result = await getPendingCoaches();
    expect(result.data).toEqual(coaches);
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
  });

  it("returns error when query fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "DB error" } })
    );

    const result = await getPendingCoaches();
    expect(result.error).toBe("DB error");
    expect(result.data).toBeNull();
  });
});

describe("approveCoach", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await approveCoach("coach-1");
    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when not the super-admin", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "other-1", email: "other@test.com" } },
      error: null,
    });
    const result = await approveCoach("coach-1");
    expect(result.error).toBe("Not authorized");
  });

  it("approves a coach and revalidates the dashboard", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: null })
    );

    const result = await approveCoach("coach-1");
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("returns error when update fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "Update failed" } })
    );

    const result = await approveCoach("coach-1");
    expect(result.error).toBe("Update failed");
  });
});
