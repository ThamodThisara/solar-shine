import { account } from '@/lib/appwrite';
import { ID } from 'appwrite';

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
