import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import { updateProfile } from "@/app/actions/profile";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "user-1", email: "user@test.com" } },
    error: null,
  });
});

describe("updateProfile", () => {
  it("updates profile and syncs auth metadata", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateProfile({
      fullName: "Updated Name",
      phone: "+1234567890",
    });

    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: "Updated Name" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/portal");
  });

  it("sets phone to null when not provided", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await updateProfile({ fullName: "Name Only" });

    expect(result.error).toBeNull();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateProfile({ fullName: "Test" });

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when database update fails", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: null, error: { message: "Update failed" } })
    );

    const result = await updateProfile({ fullName: "Test" });

    expect(result.error).toBe("Update failed");
    // Should NOT call auth.updateUser if profile update failed
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
