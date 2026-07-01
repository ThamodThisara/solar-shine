import { Client, Teams, Users, Account, Databases, ID, Query } from 'node-appwrite';
import nodemailer from 'nodemailer';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY ?? req.headers['x-appwrite-key'] ?? '');

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

  if (callerPrefs.role !== 'admin' && !(method === 'GET' && path === '/users') && !(method === 'POST' && path === '/projects/assign')) {
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
      
      // 1. List all teams to find their role preferences or match by name
      const teamList = await teams.list([Query.limit(100)]);
      const teamRoleMap = {};
      for (const t of teamList.teams) {
        let role = t.prefs?.role;
        if (!role) {
          const lowerName = t.name.toLowerCase();
          if (lowerName.includes('planning')) {
            role = 'planning_engineer';
          } else if (lowerName.includes('project')) {
            role = 'project_engineer';
          } else if (lowerName.includes('sales')) {
            role = 'sales_manager';
          } else if (lowerName.includes('admin')) {
            role = 'admin';
          }
        }
        if (role) {
          teamRoleMap[t.$id] = role;
        }
      }

      // 2. Fetch memberships for each team to map users to roles
      const userRolesMap = {};
      for (const t of teamList.teams) {
        const role = teamRoleMap[t.$id];
        if (!role) continue;
        try {
          const memberships = await teams.listMemberships(t.$id, [Query.limit(100)]);
          for (const m of memberships.memberships) {
            if (!userRolesMap[m.userId]) {
              userRolesMap[m.userId] = new Set();
            }
            userRolesMap[m.userId].add(role);
          }
        } catch (e) {
          error(`Failed to list memberships for team ${t.$id}: ${e.message}`);
        }
      }

      // 3. Fetch all users and resolve roles
      const result = await users.list(
        [Query.limit(200)],
        query.search || undefined
      );

      const mapped = result.users
        .map((u) => {
          let role = u.prefs?.role;
          if (!role && userRolesMap[u.$id]) {
            const rolesArr = Array.from(userRolesMap[u.$id]);
            role = rolesArr[0];
          }
          return {
            $id: u.$id,
            name: u.name,
            email: u.email,
            role: role ?? null,
          };
        })
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
      const { name, role } = parseBody();
      const result = await teams.create(ID.unique(), name);
      if (role) {
        try {
          await teams.updatePrefs(result.$id, { role });
          result.prefs = { role };
        } catch (e) {
          error(`Failed to set team role prefs: ${e.message}`);
        }
      }
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

      // Get the team's role from its preferences and assign it to the user
      try {
        const teamObj = await teams.get(match[1]);
        const teamRole = teamObj.prefs?.role;
        if (teamRole) {
          await users.updatePrefs(membership.userId, { role: teamRole });
        }
      } catch (e) {
        error(`Failed to set user role from team: ${e.message}`);
      }

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

    if (method === 'POST' && path === '/projects/assign') {
      const { assignees, projectName, origin } = parseBody();
      if (!assignees || !projectName) {
        return res.json({ error: 'Missing assignees or projectName' }, 400);
      }

      // Convert assignees to array if string
      const assigneeList = typeof assignees === 'string'
        ? assignees.split(',').map((s) => s.trim()).filter(Boolean)
        : Array.isArray(assignees) ? assignees.filter(Boolean) : [];

      if (assigneeList.length === 0) {
        return res.json({ success: true, message: 'No assignees to notify' });
      }

      const dbs = new Databases(client);
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '6873ba790033a7d5cfdb';

      // Setup SMTP Transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false, // TLS
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD
        }
      });

      const results = [];

      for (const email of assigneeList) {
        try {
          // 1. Resolve user ID from email
          const userList = await users.list([Query.equal('email', email)]);
          if (userList.total === 0) {
            log(`User with email ${email} not found in Appwrite auth.`);
            continue;
          }

          const userObj = userList.users[0];
          const userId = userObj.$id;
          const userName = userObj.name || email;

          // Resolve user's role dynamically to determine redirect link
          let role = userObj.prefs?.role;
          if (!role) {
            try {
              const teamList = await teams.list([Query.limit(100)]);
              for (const t of teamList.teams) {
                const memberships = await teams.listMemberships(t.$id, [Query.limit(100)]);
                if (memberships.memberships.some(m => m.userId === userId)) {
                  role = t.prefs?.role;
                  if (!role) {
                    const lowerName = t.name.toLowerCase();
                    if (lowerName.includes('planning')) role = 'planning_engineer';
                    else if (lowerName.includes('project')) role = 'project_engineer';
                    else if (lowerName.includes('sales')) role = 'sales_manager';
                    else if (lowerName.includes('admin')) role = 'admin';
                  }
                  if (role) break;
                }
              }
            } catch (err) {
              error(`Failed to resolve team role during notification for ${email}: ${err.message}`);
            }
          }

          // Choose correct path based on resolved role
          let targetPath = '/admin?tab=projects';
          if (role === 'sales_manager') {
            targetPath = '/sales';
          } else if (role === 'project_engineer' || role === 'planning_engineer') {
            targetPath = '/engineer';
          }

          const inAppLink = targetPath;
          const emailLink = origin ? `${origin.replace(/\/$/, '')}${targetPath}` : '';

          // 2. Create database notification document with markdown bold for project name
          await dbs.createDocument(
            databaseId,
            'notifications',
            ID.unique(),
            {
              user_id: userId,
              title: 'New Project Assignment',
              content: `You have been assigned to the project: **${projectName}**`,
              read: false,
              link: inAppLink
            }
          );

          // 3. Send notification email
          const mailOptions = {
            from: `"Solar Shine" <helixz.heshan@gmail.com>`,
            to: email,
            subject: `[Solar Shine] Assigned to Project: ${projectName}`,
            text: `Hello ${userName},\n\nYou have been assigned to the project "${projectName}" on Solar Shine.\n\nYou can view and access the project execution details here: ${emailLink || 'in your dashboard'}\n\nBest regards,\nSolar Shine Team`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333;">
                <h2 style="color: #2563eb; margin-top: 0;">Solar Shine Project Assignment</h2>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>You have been assigned to a new project: <strong>${projectName}</strong>.</p>
                ${emailLink ? `<p style="margin-top: 20px;"><a href="${emailLink}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #fff; text-decoration: none; border-radius: 5px; font-weight: bold;">View Project Details</a></p>` : ''}
                <p style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; font-size: 0.9em; color: #666;">
                  Best regards,<br/>Solar Shine Team
                </p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          log(`Successfully notified ${email}`);
          results.push({ email, success: true });
        } catch (err) {
          error(`Failed to notify ${email}: ${err.message}`);
          results.push({ email, success: false, error: err.message });
        }
      }

      return res.json({ success: true, results });
    }

    return res.json({ error: 'Not found' }, 404);
  } catch (e) {
    error(e.message);
    return res.json({ error: e.message }, 500);
  }
};
