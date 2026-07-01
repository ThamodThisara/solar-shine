import { functions, TEAM_MANAGEMENT_FUNCTION_ID } from '@/lib/appwrite';
import { ExecutionMethod, type Models } from 'appwrite';

export async function callTeamFunction<T>(path: string, method: ExecutionMethod, body?: unknown): Promise<T> {
  const execution = await functions.createExecution(
    TEAM_MANAGEMENT_FUNCTION_ID,
    body !== undefined ? JSON.stringify(body) : undefined,
    false,
    path,
    method
  );

  const parsed = execution.responseBody ? JSON.parse(execution.responseBody) : undefined;

  if (execution.responseStatusCode >= 400) {
    throw new Error(parsed?.error || `Request failed (${execution.responseStatusCode})`);
  }

  return parsed as T;
}

export interface TeamListResult {
  teams: Models.Team<Models.Preferences>[];
  total: number;
}

export async function fetchTeams(search?: string): Promise<TeamListResult> {
  try {
    const path = search ? `/teams?search=${encodeURIComponent(search)}` : '/teams';
    return await callTeamFunction<TeamListResult>(path, ExecutionMethod.GET);
  } catch (error) {
    console.error('Error fetching teams:', error);
    throw error;
  }
}

export async function createTeam(
  name: string,
  role?: string
): Promise<Models.Team<Models.Preferences>> {
  try {
    return await callTeamFunction('/teams', ExecutionMethod.POST, { name, role });
  } catch (error) {
    console.error('Error creating team:', error);
    throw error;
  }
}

export async function deleteTeam(teamId: string): Promise<void> {
  try {
    await callTeamFunction(`/teams/${teamId}`, ExecutionMethod.DELETE);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
}

export interface MembershipListResult {
  memberships: Models.Membership[];
  total: number;
}

export async function fetchTeamMembers(teamId: string, search?: string): Promise<MembershipListResult> {
  try {
    const path = search
      ? `/teams/${teamId}/memberships?search=${encodeURIComponent(search)}`
      : `/teams/${teamId}/memberships`;
    return await callTeamFunction<MembershipListResult>(path, ExecutionMethod.GET);
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}

export interface AddMemberResult {
  membership: Models.Membership;
  /** Whether a setup email was required (i.e. the user is a brand-new invitee). */
  emailRequired: boolean;
  /** Whether the setup email was successfully sent via Appwrite. */
  emailSent: boolean;
  /** Error message if the setup email failed to send, otherwise null. */
  emailError: string | null;
}

export async function addTeamMember(
  teamId: string,
  email: string,
  roles: string[],
  name?: string
): Promise<AddMemberResult> {
  try {
    return await callTeamFunction(`/teams/${teamId}/memberships`, ExecutionMethod.POST, {
      email,
      roles,
      name,
      redirectOrigin: window.location.origin,
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    throw error;
  }
}

/**
 * Marks the currently-authenticated user's own email as verified.
 * Used at the end of the onboarding flow.
 */
export async function verifyMyEmail(): Promise<void> {
  await callTeamFunction('/me/verify', ExecutionMethod.POST);
}

export async function removeTeamMember(teamId: string, membershipId: string): Promise<void> {
  try {
    await callTeamFunction(`/teams/${teamId}/memberships/${membershipId}`, ExecutionMethod.DELETE);
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
}
