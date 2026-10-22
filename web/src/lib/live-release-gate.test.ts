import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { expect, it } from "vitest";

const run = promisify(execFile);
const png = Buffer.concat([
  Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=", "base64"),
  Buffer.alloc(30_000),
]);

async function releaseGate(errorRoute?: string) {
  const requested: string[] = [];
  const server = createServer((request, response) => {
    const pathname = new URL(request.url!, "http://localhost").pathname;
    requested.push(pathname);
    if (pathname.startsWith("/api/")) {
      response.writeHead(200, { "content-type": "image/png" }); response.end(png); return;
    }
    response.writeHead(200, { "content-type": "text/html" });
    // Failed HTML deliberately includes the expected marker and enough bytes.
    response.end(`<!doctype html><html><body>予想一覧のページ 通算ランキングのページ ${pathname === errorRoute ? "Something Went Wrong エラーが発生しました" : "正常な順位データ"}${" ".repeat(55_000)}</body></html>`);
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test server address");
  try {
    await run("bash", [resolve("scripts/check-live-release.sh"), `http://127.0.0.1:${address.port}`], {
      env: { ...process.env, LIVE_RELEASE_ATTEMPTS: "1", LIVE_RELEASE_RETRY_DELAY_SECONDS: "0" },
    });
    return { ok: true, requested, stderr: "" };
  } catch (error) {
    return { ok: false, requested, stderr: (error as { stderr: string }).stderr };
  } finally {
    await new Promise<void>((done, reject) => server.close((error) => error ? reject(error) : done()));
  }
}

it("accepts healthy HTML and PNG responses through the real release-gate entrypoint", async () => {
  const result = await releaseGate();
  expect(result.ok).toBe(true);
  expect(result.requested).toContain("/rankings/predictions");
  expect(result.requested).toContain("/rankings/all-time");
});

for (const route of ["/rankings/predictions", "/rankings/all-time"]) {
  it(`rejects an HTTP-200 runtime error at ${route}`, async () => {
    const result = await releaseGate(route);
    expect(result.ok).toBe(false);
    expect(result.stderr).toContain(`FAIL html route=${route}`);
  });
}
