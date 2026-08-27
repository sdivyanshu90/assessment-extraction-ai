export function orderByDocumentPosition<T extends { pageIndex: number; orderOnPage: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.pageIndex - b.pageIndex || a.orderOnPage - b.orderOnPage);
}
