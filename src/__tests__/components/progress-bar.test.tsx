import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ProgressBar } from "@/components/progress-bar";

describe("ProgressBar", () => {
  it("renders with correct width percentage", () => {
    const { container } = render(<ProgressBar value={65} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe("65%");
  });

  it("clamps value to 0 minimum", () => {
    const { container } = render(<ProgressBar value={-10} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("clamps value to 100 maximum", () => {
    const { container } = render(<ProgressBar value={150} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("renders at 0% for value 0", () => {
    const { container } = render(<ProgressBar value={0} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });

  it("renders at 100% for value 100", () => {
    const { container } = render(<ProgressBar value={100} />);
    const fill = container.querySelector("[style]") as HTMLElement;
    expect(fill.style.width).toBe("100%");
  });

  it("uses default height when size is not specified", () => {
    const { container } = render(<ProgressBar value={50} />);
    const track = container.firstChild as HTMLElement;
    expect(track.className).toContain("h-2");
  });

  it("uses small height when size is 'sm'", () => {
    const { container } = render(<ProgressBar value={50} size="sm" />);
    const track = container.firstChild as HTMLElement;
    expect(track.className).toContain("h-1.5");
  });

  it("has rounded-full styling on both track and fill", () => {
    const { container } = render(<ProgressBar value={50} />);
    const track = container.firstChild as HTMLElement;
    expect(track.className).toContain("rounded-full");
    const fill = track.firstChild as HTMLElement;
    expect(fill.className).toContain("rounded-full");
  });
});
