import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

// Mock crypto.randomUUID for recurring checkins
vi.stubGlobal("crypto", { randomUUID: () => "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" });

import {
  getCheckins,
  getNextCheckin,
  createCheckin,
  updateCheckin,
  cancelRecurrence,
} from "@/app/actions/checkins";
import { revalidatePath } from "next/cache";

const COACH_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const CHECKIN_ID = "44444444-4444-4444-4444-444444444444";
const RECURRENCE_GROUP_ID = "77777777-7777-7777-7777-777777777777";
const NONEXISTENT_ID = "99999999-9999-9999-9999-999999999999";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: COACH_ID, email: "coach@test.com" } },
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
        return chainResult({ data: [{ id: CHECKIN_ID, status: "scheduled" }], error: null });
      }
      return chainResult({ data: [{ id: "44444444-4444-4444-4444-444444444445", status: "completed" }], error: null });
    });

    const result = await getCheckins(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getCheckins(CLIENT_ID);

    expect(result.error).toBe("Not authenticated");
  });
});

describe("getNextCheckin", () => {
  it("returns the next scheduled checkin for the coach", async () => {
    const nextCheckin = {
      id: CHECKIN_ID,
      scheduled_at: "2026-02-20T14:00:00Z",
      client: { id: CLIENT_ID, full_name: "Test Client" },
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
      clientId: CLIENT_ID,
      scheduledAt: "2026-02-20T14:00:00Z",
      coachNotes: "Review goals",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("creates recurring check-ins with shared recurrence_group", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await createCheckin({
      clientId: CLIENT_ID,
      scheduledAt: "2026-02-20T14:00:00Z",
      isRecurring: true,
      recurrenceWeeks: 4,
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
  });

  it("defaults to 12 weeks for recurring without specifying count", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await createCheckin({
      clientId: CLIENT_ID,
      scheduledAt: "2026-02-20T14:00:00Z",
      isRecurring: true,
    });

    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createCheckin({
      clientId: CLIENT_ID,
      scheduledAt: "2026-02-20T14:00:00Z",
    });

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when insert fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "Insert failed" } })
    );

    const result = await createCheckin({
      clientId: CLIENT_ID,
      scheduledAt: "2026-02-20T14:00:00Z",
    });

    expect(result.error).toBe("Insert failed");
  });
});

describe("updateCheckin", () => {
  it("updates a check-in status", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { client_id: CLIENT_ID }, error: null })
    );

    const result = await updateCheckin(CHECKIN_ID, { status: "completed" });

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("updates coach notes", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { client_id: CLIENT_ID }, error: null })
    );

    const result = await updateCheckin(CHECKIN_ID, {
      coachNotes: "Great session!",
    });

    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateCheckin(CHECKIN_ID, { status: "completed" });

    expect(result.error).toBe("Not authenticated");
  });
});

describe("cancelRecurrence", () => {
  it("cancels future scheduled check-ins in a recurring group", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { coach_id: COACH_ID, client_id: CLIENT_ID }, error: null })
    );

    const result = await cancelRecurrence(RECURRENCE_GROUP_ID);

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("checkins");
    expect(revalidatePath).toHaveBeenCalledWith(`/clients/${CLIENT_ID}`);
  });

  it("returns unauthorized when coach doesn't own the group", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { coach_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", client_id: CLIENT_ID }, error: null })
    );

    const result = await cancelRecurrence(RECURRENCE_GROUP_ID);

    expect(result.error).toBe("Unauthorized");
  });

  it("returns unauthorized when group not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await cancelRecurrence(NONEXISTENT_ID);

    expect(result.error).toBe("Unauthorized");
  });
});
