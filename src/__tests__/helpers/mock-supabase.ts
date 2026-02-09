import { vi } from "vitest";

/**
 * Creates a deeply chainable mock of the Supabase client.
 *
 * Usage:
 *   const { mockSupabase, mockCreateClient } = createMockSupabase();
 *
 *   // Configure per-test responses:
 *   mockSupabase.from.mockImplementation((table) => {
 *     if (table === "goals") return chainResult({ data: [...], error: null });
 *     return chainResult({ data: null, error: null });
 *   });
 */

interface ChainableQuery {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
}

/**
 * Build a chainable query object that resolves to a specific result.
 * All chain methods return `this`, terminal methods (single/maybeSingle)
 * return the result. When no terminal is called, the chain itself is thenable.
 */
export function chainResult(result: { data: unknown; error: unknown; count?: number | null }): ChainableQuery {
  const chain: ChainableQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  // Make the chain itself act as a promise (for queries without terminal .single())
  // This handles: const { data, error } = await supabase.from("x").select("*").eq(...)
  (chain as unknown as Record<string, unknown>).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);

  return chain;
}

/**
 * Create a full mock Supabase client + the mocked createClient function.
 *
 * @param options.user - The authenticated user (null = unauthenticated)
 */
export function createMockSupabase(options?: {
  user?: { id: string; email: string } | null;
}) {
  const user = options?.user ?? { id: "test-user-id", email: "test@example.com" };

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn((_table: string) => chainResult({ data: null, error: null })),
  };

  // Mock the createClient import
  const mockCreateClient = vi.fn().mockResolvedValue(mockSupabase);

  return { mockSupabase, mockCreateClient };
}
