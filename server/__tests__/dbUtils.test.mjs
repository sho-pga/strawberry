import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// We'll inject a mock Prisma instance directly into dbUtils using the
// _setPrisma helper instead of relying on Vitest module mocks. This keeps
// tests independent from `prisma generate` and the generated client.

function createMockPrisma() {
  const mock = {
    prompt: {
      create: vi.fn(async ({ data }) => ({ id: 123, ...data })),
      findMany: vi.fn(async () => [
        { id: 1, prompt: "hi", createdAt: new Date() },
      ]),
    },
    aIResult: {
      create: vi.fn(async ({ data }) => ({ id: 456, ...data })),
      findUnique: vi.fn(async ({ where }) =>
        where.id === 456 ? { id: 456, promptId: 123, result: {} } : null
      ),
    },
    // allow disconnect calls
    $disconnect: vi.fn(async () => {}),
  };
  return mock;
}

describe("dbUtils (Prisma wrappers)", () => {
  let dbUtils;

  beforeEach(async () => {
    // Dynamic import so we can inject a mock Prisma instance into the module
    const mod = await import("../utils/dbUtils.js");
    dbUtils = mod.default ?? mod;
    const mockPrisma = createMockPrisma();
    dbUtils._setPrisma(mockPrisma);
  });

  afterEach(() => {
    dbUtils._resetPrisma();
  });

  it("createPrompt returns id", async () => {
    const res = await dbUtils.createPrompt("hello world");
    expect(res).toHaveProperty("id");
    expect(res.id).toBe(123);
  });

  it("createAIResult returns id", async () => {
    const res = await dbUtils.createAIResult(123, { foo: "bar" });
    expect(res).toHaveProperty("id");
    expect(res.id).toBe(456);
  });

  it("getAIResultById returns row or null", async () => {
    const row = await dbUtils.getAIResultById(456);
    expect(row).not.toBeNull();
    expect(row.id).toBe(456);
    const nullRow = await dbUtils.getAIResultById(9999);
    expect(nullRow).toBeNull();
  });

  it("getPrompts returns array", async () => {
    const rows = await dbUtils.getPrompts(10);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows[0]).toHaveProperty("prompt");
  });
});
