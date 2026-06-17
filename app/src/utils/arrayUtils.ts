// Returns sorted unique string values.
export const uniqueValues = (values: string[]): string[] => {
  return [...new Set(values.filter(Boolean))].sort();
};