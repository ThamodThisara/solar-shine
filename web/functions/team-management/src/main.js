import { Client, Teams, Users, Account, ID, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers['x-appwrite-key'] ?? '');

  const callerUserId = req.headers['x-appwrite-user-id'];
  if (!callerUserId) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  const users = new Users(client);
  const method = req.method;
  const path = req.path;
  const query = req.query ?? {};
  // Don't touch req.bodyJson eagerly: its getter runs JSON.parse(bodyRaw),
  // which throws on GET/DELETE (empty body). Parse lazily and defensively.
  const parseBody = () => {
    if (!req.bodyRaw) return {};
    try {
      return JSON.parse(req.bodyRaw);
    } catch {
      return {};
    }
  };

  // Self-service route: a freshly-onboarded user marks THEIR OWN email verified.
  // Requires only an authenticated session (which itself requires having completed
  // the recovery flow, i.e. proven email ownership). Never verifies another user.
  if (method === 'POST' && path === '/me/verify') {
    try {
      await users.updateEmailVerification(callerUserId, true);
      return res.json({ success: true });
    } catch (e) {
      error(e.message);
      return res.json({ error: e.message }, 500);
    }
  }

  // All remaining routes are admin-only team management.
  let callerPrefs;
  try {
    callerPrefs = await users.getPrefs(callerUserId);
  } catch (e) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  if (callerPrefs.role !== 'admin') {
    return res.json({ error: 'Forbidden: admin role required' }, 403);
  }

  const teams = new Teams(client);
  const account = new Account(client);

  const ENGINEER_ROLES = ['project_engineer', 'planning_engineer'];

  try {
    // List platform users, optionally filtered by role. Used by the Site Visits
    // module so admins can assign a visit to a real engineer account.
    // `?role=engineer` returns any engineer role; `?role=<specific>` matches exactly.
    if (method === 'GET' && path === '/users') {
      const roleFilter = query.role;
      const result = await users.list(
        [Query.limit(200)],
        query.search || undefined
      );
      const mapped = result.users
        .map((u) => ({
          $id: u.$id,
          name: u.name,
          email: u.email,
          role: u.prefs?.role ?? null,
        }))
        .filter((u) => {
          if (!roleFilter) return true;
          if (roleFilter === 'engineer') return ENGINEER_ROLES.includes(u.role);
          return u.role === roleFilter;
        });
      return res.json({ users: mapped, total: mapped.length });
    }

    if (method === 'GET' && path === '/teams') {
      const result = await teams.list(
        [Query.orderDesc('$createdAt'), Query.limit(100)],
        query.search || undefined
      );
      return res.json(result);
    }

    if (method === 'POST' && path === '/teams') {
      const { name } = parseBody();
      const result = await teams.create(ID.unique(), name);
      return res.json(result);
    }

    let match = path.match(/^\/teams\/([^/]+)$/);
    if (method === 'DELETE' && match) {
      await teams.delete(match[1]);
      return res.json({ success: true });
    }

    match = path.match(/^\/teams\/([^/]+)\/memberships$/);
    if (method === 'GET' && match) {
      const result = await teams.listMemberships(
        match[1],
        [Query.orderDesc('$createdAt'), Query.limit(100)],
        query.search || undefined
      );
      return res.json(result);
    }

    if (method === 'POST' && match) {
      const { email, roles, name, redirectOrigin } = parseBody();
      const membership = await teams.createMembership(
        match[1],
        roles,
        email,
        undefined,
        undefined,
        undefined,
        name
      );

      // For brand-new invitees (no password yet), send an account-setup email
      // via the recovery flow so they can set their username/password and verify.
      // The membership add already succeeded; report the email outcome separately
      // so the UI can confirm success only when the email truly went out.
      let emailRequired = false;
      let emailSent = false;
      let emailError = null;
      try {
        const user = await users.get(membership.userId);
        if (!user.passwordUpdate) {
          emailRequired = true;
          if (!redirectOrigin) {
            throw new Error('Missing redirect origin for the setup email');
          }
          const url = `${redirectOrigin}/onboarding?email=${encodeURIComponent(email)}`;
          await account.createRecovery(email, url);
          emailSent = true;
        }
      } catch (e) {
        emailError = e.message;
        error(`Failed to send setup email: ${e.message}`);
      }

      return res.json({ membership, emailRequired, emailSent, emailError });
    }

    match = path.match(/^\/teams\/([^/]+)\/memberships\/([^/]+)$/);
    if (method === 'DELETE' && match) {
      await teams.deleteMembership(match[1], match[2]);
      return res.json({ success: true });
    }

    return res.json({ error: 'Not found' }, 404);
  } catch (e) {
    error(e.message);
    return res.json({ error: e.message }, 500);
  }
};
