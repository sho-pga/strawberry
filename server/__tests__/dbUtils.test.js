const { vi, describe, it, expect, beforeEach, afterEach } = require("vitest");

// Mock @prisma/client before importing dbUtils
vi.mock("@prisma/client", () => {
  class MockPrisma {
    constructor() {
      this.prompt = {
        create: vi.fn(async ({ data }) => ({ id: 123, ...data })),
        findMany: vi.fn(async () => [
          { id: 1, prompt: "hi", createdAt: new Date() },
        ]),
      };
      this.aIResult = {
        create: vi.fn(async ({ data }) => ({ id: 456, ...data })),
        findUnique: vi.fn(async ({ where }) =>
          where.id === 456 ? { id: 456, promptId: 123, result: {} } : null
        ),
      };
    }
  }
  return { PrismaClient: MockPrisma };
});

describe("dbUtils (Prisma wrappers)", () => {
  let dbUtils;

  beforeEach(() => {
    // Re-require to ensure the mocked PrismaClient is used
    delete require.cache[require.resolve("../utils/dbUtils")];
    dbUtils = require("../utils/dbUtils");
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
