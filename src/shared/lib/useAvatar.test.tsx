import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { server } from "@/mocks/node";
import { setToken } from "@/shared/api/client";
import { Avatar } from "@/shared/ui";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  setToken("test-token");
  // jsdom has no object URLs
  URL.createObjectURL = (blob) => `blob:${(blob as Blob).size}`;
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  setToken(null);
});

/* The same face shows up in the member list, the feed and the profile. Fetching it once per
   component would mean a request per avatar on every screen. */
test("the mirrored avatar is fetched once and shared by every component showing that user", async () => {
  let requests = 0;
  server.use(
    http.get("/api/v1/users/:id/avatar", () => {
      requests++;
      return HttpResponse.arrayBuffer(new ArrayBuffer(8), {
        headers: { "Content-Type": "image/jpeg" },
      });
    }),
  );

  const { container } = render(
    <>
      <Avatar name="Ann" seed={77} hasAvatar />
      <Avatar name="Ann" seed={77} hasAvatar />
      <Avatar name="Ann" seed={77} hasAvatar />
    </>,
  );

  await waitFor(() => {
    expect(container.querySelectorAll("img")).toHaveLength(3);
  });
  expect(requests).toBe(1);
});

test("a user without a mirrored avatar falls back to the initial and never asks for bytes", async () => {
  let requests = 0;
  server.use(
    http.get("/api/v1/users/:id/avatar", () => {
      requests++;
      return new HttpResponse(null, { status: 404 });
    }),
  );

  render(<Avatar name="Bob" seed={88} />);

  expect(await screen.findByText("B")).toBeInTheDocument();
  expect(requests).toBe(0);
});
