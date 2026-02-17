const categoryConfig: Record<
  string,
  { label: string; className: string }
> = {
  professional: {
    label: "Professional, Business & Finance",
    className: "bg-purple-100 text-purple-700",
  },
  fitness: {
    label: "Fitness & Health",
    className: "bg-blue-100 text-blue-700",
  },
  relationships: {
    label: "Relationships & Socials",
    className: "bg-teal-100 text-teal-700",
  },
  spirituality: {
    label: "Spirituality & Psychological Wellbeing",
    className: "bg-amber-100 text-amber-700",
  },
};

export function CategoryTag({ category }: { category: string }) {
  const config = categoryConfig[category] || {
    label: category,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function getCategoryLabel(category: string): string {
  return categoryConfig[category]?.label || category;
}

export const CATEGORIES = [
  { value: "professional", label: "Professional, Business & Finance" },
  { value: "fitness", label: "Fitness & Health" },
  { value: "relationships", label: "Relationships & Socials" },
  { value: "spirituality", label: "Spirituality & Psychological Wellbeing" },
] as const;
