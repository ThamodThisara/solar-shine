import { account, functions, TEAM_MANAGEMENT_FUNCTION_ID } from '@/lib/appwrite';
import { ID, ExecutionMethod } from 'appwrite';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export interface AuthUser {
  $id: string;
  email: string;
  name: string;
  role?: string;
}

export const loginAdmin = async (credentials: LoginCredentials): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    // Create email session
    await account.createEmailPasswordSession(credentials.email, credentials.password);
    
    // Get user details
    const user = await account.get();
    const prefs = await account.getPrefs();
    
    return {
      user: {
        $id: user.$id,
        email: user.email,
        name: user.name,
        role: prefs.role,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { 
      user: null, 
      error: error.message || 'Authentication failed' 
    };
  }
};

export const registerAdmin = async (credentials: RegisterCredentials): Promise<{ user: AuthUser | null; error: string | null }> => {
  try {
    // Create account
    const newUser = await account.create(
      ID.unique(),
      credentials.email,
      credentials.password,
      credentials.name
    );
    
    // Auto-login after registration
    await account.createEmailPasswordSession(credentials.email, credentials.password);

    // Set a default role in user preferences
    await account.updatePrefs({ role: 'admin' });
    
    return {
      user: {
        $id: newUser.$id,
        email: newUser.email,
        name: newUser.name,
        role: 'admin',
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { 
      user: null, 
      error: error.message || 'Registration failed' 
    };
  }
};

export const logoutAdmin = async (): Promise<{ error: string | null }> => {
  try {
    await account.deleteSession('current');
    return { error: null };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { error: error.message || 'Logout failed' };
  }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const user = await account.get();
    const prefs = await account.getPrefs();
    return {
      $id: user.$id,
      email: user.email,
      name: user.name,
      role: prefs.role,
    };
  } catch (error) {
    // User not authenticated
    return null;
  }
};

export const checkIsAuthenticated = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return !!user;
};

/**
 * Sends a branded password-reset email via the team-management Appwrite Function.
 *
 * The function uses the same SMTP configuration (SMTP_HOST / SMTP_USERNAME /
 * SMTP_PASSWORD / SMTP_FROM) that is already used when an admin adds a new user,
 * so all outbound email is routed through a single, consistent SMTP channel.
 *
 * The route is intentionally unauthenticated — the user can't provide a session
 * token because they've forgotten their password.
 */
export const sendPasswordReset = async (
  email: string,
  redirectOrigin: string
): Promise<{ error: string | null }> => {
  try {
    const execution = await functions.createExecution(
      TEAM_MANAGEMENT_FUNCTION_ID,
      JSON.stringify({ email, redirectOrigin }),
      false,           // synchronous
      '/auth/forgot-password',
      ExecutionMethod.POST
    );

    // The function always returns 200 (to prevent email enumeration), so any
    // non-2xx status code indicates a genuine infrastructure problem.
    if (execution.responseStatusCode >= 500) {
      const parsed = execution.responseBody
        ? JSON.parse(execution.responseBody)
        : null;
      return { error: parsed?.error || 'Failed to send password reset email' };
    }

    return { error: null };
  } catch (err: any) {
    console.error('Password reset request error:', err);
    return { error: err.message || 'Failed to send password reset email' };
  }
};


/**
 * Completes the password-reset flow.
 * `userId` and `secret` come from the Appwrite-generated reset link.
 */
export const confirmPasswordReset = async (
  userId: string,
  secret: string,
  newPassword: string
): Promise<{ error: string | null }> => {
  try {
    await account.updateRecovery(userId, secret, newPassword);
    return { error: null };
  } catch (error: any) {
    console.error('Password reset confirmation error:', error);
    return { error: error.message || 'Failed to reset password' };
  }
};
