import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the public surface of auth-server.verifyIdToken without standing up
// a full Firebase project: jose's jwtVerify is mocked so we can drive the
// success/failure branches deterministically.

const jwtVerifyMock = vi.fn();

vi.mock("jose", () => ({
  jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args),
  createRemoteJWKSet: () => ({}),
}));

vi.mock("@/db", () => ({
  getDb: () => {
    throw new Error("db should not be touched in verifyIdToken tests");
  },
}));

// Set the project id env var BEFORE importing the module.
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "test-project";

// Dynamic import after env is set so module-level reads pick it up.
const { verifyIdToken } = await import("../auth-server");

function makeReq(authHeader: string | null): Request {
  const headers = new Headers();
  if (authHeader !== null) headers.set("Authorization", authHeader);
  return new Request("https://example.test/api", { headers });
}

describe("verifyIdToken", () => {
  beforeEach(() => {
    jwtVerifyMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when no Authorization header", async () => {
    const r = await verifyIdToken(makeReq(null));
    expect(r).toBeNull();
  });

  it("returns null when Authorization header is not Bearer", async () => {
    const r = await verifyIdToken(makeReq("Basic foo:bar"));
    expect(r).toBeNull();
  });

  it("returns null when token is empty", async () => {
    const r = await verifyIdToken(makeReq("Bearer "));
    expect(r).toBeNull();
  });

  it("returns null when jose throws (invalid signature etc.)", async () => {
    jwtVerifyMock.mockRejectedValueOnce(new Error("invalid signature"));
    const r = await verifyIdToken(makeReq("Bearer eyJhbGc.payload.sig"));
    expect(r).toBeNull();
  });

  it("returns null when payload is missing sub", async () => {
    jwtVerifyMock.mockResolvedValueOnce({ payload: { auth_time: 1 } });
    const r = await verifyIdToken(makeReq("Bearer eyJhbGc.payload.sig"));
    expect(r).toBeNull();
  });

  it("returns null when auth_time is missing (not a Firebase ID Token)", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { sub: "abc123", email: "x@example.com" },
    });
    const r = await verifyIdToken(makeReq("Bearer eyJhbGc.payload.sig"));
    expect(r).toBeNull();
  });

  it("returns the verified token on a valid Firebase payload", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: {
        sub: "uid-123",
        email: "user@example.com",
        email_verified: true,
        auth_time: 1700000000,
      },
    });
    const r = await verifyIdToken(makeReq("Bearer eyJhbGc.payload.sig"));
    expect(r).not.toBeNull();
    expect(r?.uid).toBe("uid-123");
    expect(r?.email).toBe("user@example.com");
    expect(r?.emailVerified).toBe(true);
  });

  it("calls jose with the configured issuer and audience", async () => {
    jwtVerifyMock.mockResolvedValueOnce({
      payload: { sub: "uid", auth_time: 1 },
    });
    await verifyIdToken(makeReq("Bearer eyJhbGc.payload.sig"));
    const [, , opts] = jwtVerifyMock.mock.calls[0];
    expect(opts).toMatchObject({
      issuer: "https://securetoken.google.com/test-project",
      audience: "test-project",
      algorithms: ["RS256"],
    });
  });
});
