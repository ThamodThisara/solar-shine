import { functions, TEAM_MANAGEMENT_FUNCTION_ID } from '@/lib/appwrite';
import { ExecutionMethod } from 'appwrite';

export interface PlatformUser {
  $id: string;
  name: string;
  email: string;
  role: string | null;
}

interface UserListResult {
  users: PlatformUser[];
  total: number;
}

/**
 * Fetches platform users via the admin-only `team-management` function. Pass a
 * `role` to filter (`'engineer'` matches any engineer role, or an exact role
 * string). Only callable by admins — the function rejects everyone else.
 */
export async function fetchUsers(role?: string, search?: string): Promise<PlatformUser[]> {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (search) params.set('search', search);
  const qs = params.toString();
  const path = qs ? `/users?${qs}` : '/users';

  try {
    const execution = await functions.createExecution(
      TEAM_MANAGEMENT_FUNCTION_ID,
      undefined,
      false,
      path,
      ExecutionMethod.GET
    );
    const parsed: UserListResult | { error?: string } = execution.responseBody
      ? JSON.parse(execution.responseBody)
      : { users: [], total: 0 };

    if (execution.responseStatusCode >= 400) {
      throw new Error((parsed as { error?: string }).error || `Request failed (${execution.responseStatusCode})`);
    }

    return (parsed as UserListResult).users ?? [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/** Convenience helper for the common case of listing assignable engineers. */
export function fetchEngineers(search?: string): Promise<PlatformUser[]> {
  return fetchUsers('engineer', search);
}
