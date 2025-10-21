// Lazy-init Prisma client so importing this file in test/dev does not
// immediately open a connection unless used. We require `@prisma/client`
// inside the getter so test frameworks (Vitest) can mock the module before
// this file attempts to instantiate the client.
let prisma = null;
function getPrisma() {
  if (prisma) return prisma;

  let PrismaClient;
  try {
    // This will be intercepted by Vitest's module mocking when tests run.
    // In normal runtime it returns the generated PrismaClient class.
    PrismaClient = require("@prisma/client").PrismaClient;
  } catch (e) {
    // Provide a clearer error if the client isn't available (devs must run
    // `prisma generate` when using real DB in local/dev).
    throw new Error(
      '@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.'
    );
  }

  prisma = new PrismaClient();
  return prisma;
}

/**
 * Create a prompt record.
 * @param {string} promptText
 * @returns {Promise<{id:number}>}
 */
async function createPrompt(promptText) {
  const p = getPrisma();
  const rec = await p.prompt.create({ data: { prompt: promptText } });
  return { id: rec.id };
}

/**
 * Create an AI result linked to a prompt
 * @param {number} promptId
 * @param {any} resultObj
 * @returns {Promise<{id:number}>}
 */
async function createAIResult(promptId, resultObj) {
  const p = getPrisma();
  const rec = await p.aIResult.create({
    data: { promptId, result: resultObj },
  });
  return { id: rec.id };
}

/**
 * Get AI result by id
 * @param {number} id
 */
async function getAIResultById(id) {
  const p = getPrisma();
  const row = await p.aIResult.findUnique({ where: { id } });
  return row || null;
}

/**
 * Get recent prompts
 */
async function getPrompts(limit = 50) {
  const p = getPrisma();
  const rows = await p.prompt.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  return rows;
}

module.exports = {
  createPrompt,
  createAIResult,
  getAIResultById,
  getPrompts,
  // Expose Prisma for tests/advanced usage
  _getPrisma: getPrisma,
  // Test helpers: allow injecting a mock Prisma instance and clearing it
  _setPrisma(prismaInstance) {
    prisma = prismaInstance;
  },
  _resetPrisma() {
    if (prisma && typeof prisma.$disconnect === "function") {
      try {
        prisma.$disconnect();
      } catch (e) {
        // ignore
      }
    }
    prisma = null;
  },
};
