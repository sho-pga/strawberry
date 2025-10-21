const request = require("supertest");
const app = require("../index");

(async () => {
  try {
    if (typeof app.startServer === "function")
      await app.startServer({ listen: false });
    const res = await request(app)
      .post("/prompt")
      .send({ prompt: "Debug prompt for stack" });
    console.log("Status:", res.status);
    console.log("Headers:", res.headers);
    try {
      console.log("Body:", JSON.stringify(res.body, null, 2));
    } catch (e) {
      console.log("Body: <non-json>");
    }
  } catch (err) {
    console.error("Error running debug prompt:", err.stack || err);
    process.exit(1);
  }
})();
