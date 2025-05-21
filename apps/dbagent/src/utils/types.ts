export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function compactObject<T>(obj: Record<string, T | null | undefined>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => notEmpty(value))) as Record<string, T>;
}
