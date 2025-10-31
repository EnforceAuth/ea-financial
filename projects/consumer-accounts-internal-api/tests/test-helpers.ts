/**
 * Test helper types and utilities
 */

export function parseJsonResponse<T>(data: unknown): T {
  return data as T;
}
