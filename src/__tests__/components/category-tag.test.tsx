import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  CategoryTag,
  getCategoryLabel,
  CATEGORIES,
} from "@/components/category-tag";

describe("CategoryTag", () => {
  const categories = [
    { value: "professional", label: "Professional, Business & Finance", expectedClass: "bg-purple-100" },
    { value: "fitness", label: "Fitness & Health", expectedClass: "bg-blue-100" },
    { value: "relationships", label: "Relationships & Socials", expectedClass: "bg-teal-100" },
    { value: "spirituality", label: "Spirituality", expectedClass: "bg-amber-100" },
  ];

  categories.forEach(({ value, label, expectedClass }) => {
    it(`renders "${value}" with label "${label}" and correct styling`, () => {
      render(<CategoryTag category={value} />);
      const tag = screen.getByText(label);
      expect(tag).toBeInTheDocument();
      expect(tag.className).toContain(expectedClass);
    });
  });

  it("falls back to gray for unknown category", () => {
    render(<CategoryTag category="unknown_cat" />);
    const tag = screen.getByText("unknown_cat");
    expect(tag).toBeInTheDocument();
    expect(tag.className).toContain("bg-gray-100");
    expect(tag.className).toContain("text-gray-600");
  });
});

describe("getCategoryLabel", () => {
  it("returns the correct label for each category", () => {
    expect(getCategoryLabel("professional")).toBe("Professional, Business & Finance");
    expect(getCategoryLabel("fitness")).toBe("Fitness & Health");
    expect(getCategoryLabel("relationships")).toBe("Relationships & Socials");
    expect(getCategoryLabel("spirituality")).toBe("Spirituality");
  });

  it("returns the raw string for unknown category", () => {
    expect(getCategoryLabel("other")).toBe("other");
  });
});

describe("CATEGORIES constant", () => {
  it("has exactly 4 categories", () => {
    expect(CATEGORIES).toHaveLength(4);
  });

  it("contains all expected values", () => {
    const values = CATEGORIES.map((c) => c.value);
    expect(values).toContain("professional");
    expect(values).toContain("fitness");
    expect(values).toContain("relationships");
    expect(values).toContain("spirituality");
  });

  it("each category has a value and label", () => {
    CATEGORIES.forEach((cat) => {
      expect(cat.value).toBeTruthy();
      expect(cat.label).toBeTruthy();
    });
  });
});
