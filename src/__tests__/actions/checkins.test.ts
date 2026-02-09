import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

// Mock crypto.randomUUID for recurring checkins
vi.stubGlobal("crypto", { randomUUID: () => "mock-uuid-1234" });

import {
  getCheckins,
  getNextCheckin,
  createCheckin,
  updateCheckin,
  cancelRecurrence,
} from "@/app/actions/checkins";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "coach-1", email: "coach@test.com" } },
    error: null,
  });
});

describe("getCheckins", () => {
  it("returns upcoming and past checkins", async () => {
    // The function calls from("checkins") twice: once for upcoming, once for past
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return chainResult({ data: [{ id: "c1", status: "scheduled" }], error: null });
      }
      return chainResult({ data: [{ id: "c2", status: "completed" }], error: null });
    });

    const result = await getCheckins("client-1");

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getCheckins("client-1");

    expect(result.error).toBe("Not authenticated");
  });
});

describe("getNextCheckin", () => {
  it("returns the next scheduled checkin for the coach", async () => {
    const nextCheckin = {
      id: "c1",
      scheduled_at: "2026-02-20T14:00:00Z",
      client: { id: "client-1", full_name: "Test Client" },
    };
    mockSupabase.from.mockReturnValue(chainResult({ data: nextCheckin, error: null }));

    const result = await getNextCheckin();

    expect(result.data).toEqual(nextCheckin);
    expect(result.error).toBeNull();
  });

  it("returns null data when no upcoming checkins", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await getNextCheckin();

    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });
});

describe("createCheckin", () => {
  it("creates a single check-in", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await createCheckin({
      clientId: "client-1",
      scheduledAt: "2026-02-20T14:00:00Z",
      coachNotes: "Review goals",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("creates recurring check-ins with shared recurrence_group", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await createCheckin({
      clientId: "client-1",
      scheduledAt: "2026-02-20T14:00:00Z",
      isRecurring: true,
      recurrenceWeeks: 4,
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
  });

  it("defaults to 12 weeks for recurring without specifying count", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await createCheckin({
      clientId: "client-1",
      scheduledAt: "2026-02-20T14:00:00Z",
      isRecurring: true,
    });

    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createCheckin({
      clientId: "client-1",
      scheduledAt: "2026-02-20T14:00:00Z",
    });

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when insert fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "Insert failed" } })
    );

    const result = await createCheckin({
      clientId: "client-1",
      scheduledAt: "2026-02-20T14:00:00Z",
    });

    expect(result.error).toBe("Insert failed");
  });
});

describe("updateCheckin", () => {
  it("updates a check-in status", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { client_id: "client-1" }, error: null })
    );

    const result = await updateCheckin("c1", { status: "completed" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("updates coach notes", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { client_id: "client-1" }, error: null })
    );

    const result = await updateCheckin("c1", {
      coachNotes: "Great session!",
    });

    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateCheckin("c1", { status: "completed" });

    expect(result.error).toBe("Not authenticated");
  });
});

describe("cancelRecurrence", () => {
  it("cancels future scheduled check-ins in a recurring group", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { coach_id: "coach-1", client_id: "client-1" }, error: null })
    );

    const result = await cancelRecurrence("rec-group-1");

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith("/clients/client-1");
  });

  it("returns unauthorized when coach doesn't own the group", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { coach_id: "other-coach", client_id: "client-1" }, error: null })
    );

    const result = await cancelRecurrence("rec-group-1");

    expect(result.error).toBe("Unauthorized");
  });

  it("returns unauthorized when group not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await cancelRecurrence("nonexistent");

    expect(result.error).toBe("Unauthorized");
  });
});
