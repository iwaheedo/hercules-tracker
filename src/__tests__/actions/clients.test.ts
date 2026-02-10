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

const COACH_ID = "11111111-1111-1111-1111-111111111111";
const CLIENT_ID = "22222222-2222-2222-2222-222222222222";
const REL_ID = "33333333-3333-3333-3333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: COACH_ID, email: "coach@test.com" } },
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

    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
  });
});

describe("getClientProfile", () => {
  it("returns client profile when relationship exists", async () => {
    const profile = { id: CLIENT_ID, full_name: "Test Client", role: "client" };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "coach_clients") {
        return chainResult({ data: { id: REL_ID }, error: null });
      }
      if (table === "profiles") {
        return chainResult({ data: profile, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await getClientProfile(CLIENT_ID);

    expect(result.data).toEqual(profile);
    expect(result.error).toBeNull();
  });

  it("returns error when no relationship exists", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await getClientProfile(CLIENT_ID);

    expect(result.data).toBeNull();
    expect(result.error).toBe("Client not found");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getClientProfile(CLIENT_ID);

    expect(result.error).toBe("Not authenticated");
  });
});

describe("inviteClient", () => {
  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await inviteClient("test@example.com", "Test");

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error for invalid email", async () => {
    const result = await inviteClient("not-an-email", "Test");

    expect(result.error).toBe("Invalid email address");
  });

  it("returns error for empty name", async () => {
    const result = await inviteClient("test@example.com", "");

    expect(result.error).toBe("Name is required (max 200 chars)");
  });

  it("returns error when user is not a coach", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { role: "client" }, error: null })
    );

    const result = await inviteClient("test@example.com", "Test");

    expect(result.error).toBe("Only coaches can invite clients");
  });

  it("generates invite link for new client (no email or name match)", async () => {
    let profileCallIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) {
          // Verify role is coach
          return chainResult({ data: { role: "coach" }, error: null });
        }
        if (profileCallIdx === 2) {
          // Email match query → no match
          return chainResult({ data: null, error: null });
        }
        if (profileCallIdx === 3) {
          // Name fallback → no match
          return chainResult({ data: [], error: null });
        }
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("new@example.com", "New Person");

    expect(result.error).toBeNull();
    expect(result.inviteLink).toBeTruthy();
    expect(result.inviteLink).toContain("/signup");
    expect(result.inviteLink).toContain(`invite=${COACH_ID}`);
    expect(result.linked).toBe(false);
  });

  /**
   * REGRESSION TEST — This is the key scenario:
   * A client self-signs up (no invite link). Their profile exists in
   * the DB with role="client" and email set. When a coach adds them
   * via inviteClient using their email, the system should find
   * them by email and create the coach_clients link automatically.
   */
  it("links self-signed-up client when coach adds them by email", async () => {
    let profileCallIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) {
          // Verify role is coach
          return chainResult({ data: { role: "coach" }, error: null });
        }
        if (profileCallIdx === 2) {
          // Email match → found the self-signed-up client!
          return chainResult({
            data: { id: CLIENT_ID, full_name: "Self Signup Client", role: "client" },
            error: null,
          });
        }
      }
      if (table === "coach_clients") {
        // No existing link
        return chainResult({ data: null, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("selfsignup@example.com", "Self Signup Client");

    expect(result.error).toBeNull();
    expect(result.linked).toBe(true);
    expect(result.inviteLink).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("links existing client by name fallback when email not found", async () => {
    let profileCallIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) {
          return chainResult({ data: { role: "coach" }, error: null });
        }
        if (profileCallIdx === 2) {
          // Email match → no match
          return chainResult({ data: null, error: null });
        }
        if (profileCallIdx === 3) {
          // Name fallback → found client by name
          return chainResult({
            data: [{ id: CLIENT_ID, full_name: "Existing Client", role: "client" }],
            error: null,
          });
        }
      }
      if (table === "coach_clients") {
        // No existing link
        return chainResult({ data: null, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("different@example.com", "Existing Client");

    expect(result.error).toBeNull();
    expect(result.linked).toBe(true);
    expect(result.inviteLink).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("returns already-linked error when client is actively linked", async () => {
    let profileCallIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) {
          return chainResult({ data: { role: "coach" }, error: null });
        }
        if (profileCallIdx === 2) {
          // Email match → found client
          return chainResult({
            data: { id: CLIENT_ID, full_name: "Linked Client", role: "client" },
            error: null,
          });
        }
      }
      if (table === "coach_clients") {
        // Already actively linked
        return chainResult({ data: { id: REL_ID, status: "active" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("linked@example.com", "Linked Client");

    expect(result.error).toBe("This client is already linked to your account.");
    expect(result.linked).toBe(false);
  });

  it("re-activates inactive client relationship", async () => {
    let profileCallIdx = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        profileCallIdx++;
        if (profileCallIdx === 1) {
          return chainResult({ data: { role: "coach" }, error: null });
        }
        if (profileCallIdx === 2) {
          return chainResult({
            data: { id: CLIENT_ID, full_name: "Inactive Client", role: "client" },
            error: null,
          });
        }
      }
      if (table === "coach_clients") {
        return chainResult({ data: { id: REL_ID, status: "inactive" }, error: null });
      }
      return chainResult({ data: null, error: null });
    });

    const result = await inviteClient("inactive@example.com", "Inactive Client");

    expect(result.error).toBeNull();
    expect(result.linked).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });
});

describe("removeClient", () => {
  it("soft-deletes a client relationship", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { id: REL_ID }, error: null })
    );

    const result = await removeClient(CLIENT_ID);

    expect(result.error).toBeNull();
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("returns error when relationship not found", async () => {
    mockSupabase.from.mockReturnValue(chainResult({ data: null, error: null }));

    const result = await removeClient(CLIENT_ID);

    expect(result.error).toBe("Client relationship not found");
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await removeClient(CLIENT_ID);

    expect(result.error).toBe("Not authenticated");
  });
});

describe("linkClientById", () => {
  it("creates a new coach-client link", async () => {
    let callIdx = 0;
    mockSupabase.from.mockImplementation(() => {
      callIdx++;
      if (callIdx === 1) {
        return chainResult({ data: null, error: null }); // no existing link
      }
      return chainResult({ data: null, error: null }); // insert success
    });

    const result = await linkClientById(COACH_ID, CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.alreadyLinked).toBe(false);
    expect(revalidatePath).toHaveBeenCalledWith("/clients");
  });

  it("returns alreadyLinked when relationship exists", async () => {
    mockSupabase.from.mockReturnValue(
      chainResult({ data: { id: REL_ID }, error: null })
    );

    const result = await linkClientById(COACH_ID, CLIENT_ID);

    expect(result.error).toBeNull();
    expect(result.alreadyLinked).toBe(true);
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await linkClientById(COACH_ID, CLIENT_ID);

    expect(result.error).toBe("Not authenticated");
  });

  it("returns error when caller is not the coach", async () => {
    const OTHER_COACH = "99999999-9999-9999-9999-999999999999";

    const result = await linkClientById(OTHER_COACH, CLIENT_ID);

    expect(result.error).toBe("Unauthorised");
  });
});
