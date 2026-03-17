export function listToMultiline(value?: string[] | null): string {
  if (!value || value.length === 0) {
    return "";
  }

  return value.join("\n");
}

export function multilineToList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
