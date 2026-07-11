import { HttpResponse, http } from "msw";
import { resetDb } from "@/mocks/handlers";
import { server } from "@/mocks/node";
import { authenticate } from "./auth";
import { ApiError, api, getToken, setToken } from "./client";
import type { MeResponse, RoomWithProgress } from "./types";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetDb();
  setToken(null);
});
afterAll(() => server.close());

describe("authenticate", () => {
  it("exchanges init data for a token and stores it", async () => {
    const res = await authenticate();
    expect(res.token).toBe("mock-token");
    expect(getToken()).toBe("mock-token");
  });
});

describe("api client", () => {
  it("fetches typed data", async () => {
    const rooms = await api.get<RoomWithProgress[]>("/rooms");
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0]).toMatchObject({ id: 1, members_count: 4 });
  });

  it("throws ApiError with backend message and status", async () => {
    server.use(
      http.get("/api/v1/rooms/:id", () =>
        HttpResponse.json({ error: "room members only" }, { status: 403 }),
      ),
    );
    const err = await api.get("/rooms/99").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(403);
    expect((err as ApiError).message).toBe("room members only");
  });

  it("silently re-authenticates once on 401 and retries", async () => {
    let calls = 0;
    server.use(
      http.get("/api/v1/me", () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ error: "unauthorized" }, { status: 401 });
        }
        return HttpResponse.json({
          user: { id: 1 },
          achievements: [],
        });
      }),
    );
    const me = await api.get<MeResponse>("/me");
    expect(me.user.id).toBe(1);
    expect(calls).toBe(2);
    expect(getToken()).toBe("mock-token");
  });

  it("returns undefined for 204 responses", async () => {
    await expect(api.post<void>("/rooms/1/leave")).resolves.toBeUndefined();
  });
});

describe("vote handler", () => {
  it("rejects a duplicate vote with 409", async () => {
    await api.post("/checkins/c-1/vote", { approve: true });
    const err = await api.post("/checkins/c-1/vote", { approve: true }).catch((e: unknown) => e);
    expect((err as ApiError).status).toBe(409);
  });

  it("approves the checkin once the quorum is reached", async () => {
    const checkin = await api.post<{ status: string; votes_approve: number }>(
      "/checkins/c-1/vote",
      { approve: true },
    );
    expect(checkin.votes_approve).toBe(2);
    expect(checkin.status).toBe("approved");
  });
});
