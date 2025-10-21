/* eslint-disable no-undef */
const request = require("supertest");
const path = require("path");
const appModule = require("../index");

let serverApp;

beforeAll(async () => {
  // Initialize services without binding to network
  await appModule.startServer({ listen: false });
  serverApp = appModule; // exported express app
});

afterAll(async () => {
  // Close puppeteer browser if present to avoid resource leaks
  try {
    if (serverApp && serverApp.browser) {
      await serverApp.browser.close();
    }
  } catch (e) {
    // ignore
  }
});

test("GET /preview returns HTML containing title and body", async () => {
  const sample = {
    title: "Test Poem",
    body: "A summer poem for testing purposes.",
  };
  const q = encodeURIComponent(JSON.stringify({ content: sample }));
  const res = await request(serverApp).get(`/preview?content=${q}`);
  expect(res.statusCode).toBe(200);
  expect(res.text).toMatch(/Test Poem/);
  expect(res.text).toMatch(/A summer poem for testing purposes./);
});
