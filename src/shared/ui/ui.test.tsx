import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Button } from "./Button";
import { CODE_LENGTH, CodeInput, sanitizeCode } from "./CodeInput";
import { FilterTabs } from "./FilterTabs";
import { ProgressCounter, SegmentedProgress } from "./Progress";
import { Stepper } from "./Stepper";

describe("Button", () => {
  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("respects disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("SegmentedProgress", () => {
  it("renders one segment per goal unit when the goal is small", () => {
    const { container } = render(<SegmentedProgress value={2} goal={5} />);
    expect(container.querySelectorAll("span span")).toHaveLength(5);
  });

  it("falls back to a solid bar for large goals", () => {
    const { container } = render(<SegmentedProgress value={10} goal={40} />);
    expect(container.querySelectorAll("span span")).toHaveLength(1);
  });
});

describe("ProgressCounter", () => {
  it("shows value and goal", () => {
    render(<ProgressCounter value={2} goal={3} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("/3")).toBeInTheDocument();
  });
});

describe("sanitizeCode", () => {
  it("uppercases and strips ambiguous characters", () => {
    expect(sanitizeCode("k7wm2q9f")).toBe("K7WM2Q9F");
    expect(sanitizeCode("O0I1ABCDEFGH")).toBe("ABCDEFGH");
  });

  it("limits to code length", () => {
    expect(sanitizeCode("ABCDEFGHJK")).toHaveLength(CODE_LENGTH);
  });
});

describe("CodeInput", () => {
  function Harness() {
    const [value, setValue] = useState("");
    return <CodeInput value={value} onChange={setValue} />;
  }

  it("sanitizes typed input", async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText("code"), "k7o0wm");
    expect(screen.getByLabelText("code")).toHaveValue("K7WM");
  });
});

describe("Stepper", () => {
  function Harness({ initial = 5 }: { initial?: number }) {
    const [value, setValue] = useState(initial);
    return <Stepper label="Goal" value={value} min={1} max={10} onChange={setValue} />;
  }

  it("increments and decrements within range", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByText("6")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "−" }));
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("disables minus at the minimum", () => {
    render(<Harness initial={1} />);
    expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
  });
});

describe("FilterTabs", () => {
  it("switches tabs", async () => {
    const onChange = vi.fn();
    render(
      <FilterTabs
        tabs={[
          { key: "pending", label: "Pending", count: 2 },
          { key: "approved", label: "Approved" },
        ]}
        active="pending"
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Approved" }));
    expect(onChange).toHaveBeenCalledWith("approved");
  });
});
