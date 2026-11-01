// Returns sorted unique string values.
export const unique_values = (values: string[]): string[] => {
  return [...new Set(values.filter(Boolean))].sort();
};
