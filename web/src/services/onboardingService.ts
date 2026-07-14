import { account } from '@/lib/appwrite';
import { verifyMyEmail } from '@/services/teamService';

export interface CompleteOnboardingInput {
  email: string;
  userId: string;
  secret: string;
  username: string;
  password: string;
}

/**
 * Completes onboarding for an invited team member:
 * 1. Sets the first password via the recovery secret from the setup email.
 * 2. Logs the user in with the new credentials.
 * 3. Sets their username (account name).
 * 4. Marks their email verified (server-side, self only).
 * 5. Clears the session so they sign in fresh on /login.
 */
export async function completeOnboarding({
  email,
  userId,
  secret,
  username,
  password,
}: CompleteOnboardingInput): Promise<void> {
  try {
    // Clear any existing active session on the browser first to prevent session conflicts
    try {
      await account.deleteSession('current');
    } catch (e) {
      // Ignore if there is no active session
    }

    await account.updateRecovery(userId, secret, password);
    await account.createEmailPasswordSession(email, password);
    await account.updateName(username);
    await verifyMyEmail();
    await account.deleteSession('current');
  } catch (error: any) {
    console.error('Onboarding error:', error);
    throw new Error(error?.message || 'Failed to complete account setup');
  }
}
