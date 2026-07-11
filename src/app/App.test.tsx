import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { routeTree } from "@/routeTree.gen";

test("renders the home route", async () => {
  const router = createRouter({ routeTree, history: createMemoryHistory() });
  render(<RouterProvider router={router} />);
  expect(await screen.findByText("BuddyGym")).toBeInTheDocument();
});
