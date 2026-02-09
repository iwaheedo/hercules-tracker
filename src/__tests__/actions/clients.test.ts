import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase, chainResult } from "../helpers/mock-supabase";

const { mockSupabase, mockCreateClient } = createMockSupabase();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

import {
  getCoachClients,
  getClientProfile,
  inviteClient,
  removeClient,
  linkClientById,
} from "@/app/actions/clients";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "coach-1", email: "coach@test.com" } },
    error: null,
  });
});

describe("getCoachClients", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getCoachClients();

    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeNull();
  });

  it("returns empty array when no clients linked", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: [], error: null }));

    const result = await getCoachClients();

    // With empty relationships, returns empty clients
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});

describe("getClientProfile", () => {
  it("returns client profile when relationship exists", async () => {
    const profile = { id: "client-1", full_name: "Test Client", role: "client" };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "coach_clients") {
        return chainResult({ data: { id: "rel-1" }, error: null });
      }
      if (table === "profiles") {
        return chainResult({ data: profile, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await getClientProfile("client-1");

    expect(result.data).toEqual(profile);
    expect(result.error).toBeNull();
  });

  it("returns error when no relationship exists", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await getClientProfile("client-1");

    expect(result.data).toBeNull();
    expect(result.error).toBe("Client not found");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getClientProfile("client-1");

    expect(result.error).toBe("Not authenticated");
  });
});

describe("inviteClient", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await inviteClient("test@example.com", "Test");

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when user is not a coach", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { role: "client" }, error: null })
    );

    const result = await inviteClient("test@example.com", "Test");

    expect(result.error).toBe("Only coaches can invite clients");
  });

  it("generates invite link for new client", async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callIdx++;
      if (table === "profiles" && callIdx === 1) {
        // First: verify role is coach
        return chainResult({ data: { role: "coach" }, error: null });
      }
      if (table === "profiles" && callIdx === 2) {
        // Second: check for existing clients - return empty list
        return chainResult({ data: [], error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("new@example.com", "New Person");

    expect(result.error).toBeNull();
    expect(result.inviteLink).toBeTruthy();
    expect(result.inviteLink).toContain("/signup");
    expect(result.inviteLink).toContain("invite=coach-1");
    expect(result.linked).toBe(false);
  });

  it("links existing client directly", async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      callIdx++;
      if (table === "profiles" && callIdx === 1) {
        return chainResult({ data: { role: "coach" }, error: null });
      }
      if (table === "profiles" && callIdx === 2) {
        // Existing client found
        return chainResult({
          data: [{ id: "client-1", full_name: "Existing Client", role: "client" }],
          error: null,
        });
      }
      if (table === "coach_clients") {
        // No existing link
        return chainResult({ data: null, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("existing@example.com", "Existing Client");

    expect(result.error).toBeNull();
    expect(result.linked).toBe(true);
    expect(result.inviteLink).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });
});

describe("removeClient", () => {
  it("soft-deletes a client relationship", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { id: "rel-1" }, error: null })
    );

    const result = await removeClient("client-1");

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("returns error when relationship not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await removeClient("nonexistent");

    expect(result.error).toBe("Client relationship not found");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await removeClient("client-1");

    expect(result.error).toBe("Not authenticated");
  });
});

describe("linkClientById", () => {
  it("creates a new coach-client link", async () => {
    // First call: check existing → null. Second call: insert → ok
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return chainResult({ data: null, error: null }); // no existing link
      }
      return chainResult({ data: null, error: null }); // insert success
    });

    const result = await linkClientById("coach-1", "client-1");

    expect(result.error).toBeNull();
    expect(result.alreadyLinked).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("returns alreadyLinked when relationship exists", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { id: "existing-rel" }, error: null })
    );

    const result = await linkClientById("coach-1", "client-1");

    expect(result.error).toBeNull();
    expect(result.alreadyLinked).toBe(true);
  });
});
