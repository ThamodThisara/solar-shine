import { Client, Teams, Users, Account, Databases, ID, Query } from 'node-appwrite';
import nodemailer from 'nodemailer';
import https from 'https';
import http from 'http';

const PROJECTS_COLLECTION_ID = 'projects';

/**
 * Fallback role for teams created before `prefs.role` was stored, inferred from
 * the team name. Ordered most- to least-specific: "marketing" is tested before
 * "admin" so an "Admin & Marketing" team resolves to the more specific role.
 */
const TEAM_NAME_ROLE_RULES = [
  ['planning', 'planning_engineer'],
  ['project', 'project_engineer'],
  ['sales', 'sales_manager'],
  ['finance', 'finance_manager'],
  ['marketing', 'marketing_manager'],
  ['admin', 'admin'],
  ['hr', 'hr'],
];

/** Resolves a team's role from `prefs.role`, falling back to its name. */
function resolveTeamRole(team) {
  if (team.prefs?.role) return team.prefs.role;
  const lowerName = (team.name || '').toLowerCase();
  const match = TEAM_NAME_ROLE_RULES.find(([needle]) => lowerName.includes(needle));
  return match ? match[1] : undefined;
}

/** Panel path each role lands on. Roles without an entry fall back to `/admin`. */
const ROLE_HOME_PATH = {
  sales_manager: '/sales',
  hr: '/hr',
  finance_manager: '/finance',
  marketing_manager: '/marketing',
  project_engineer: '/engineer',
  planning_engineer: '/engineer',
};

/**
 * Computes the next sequential project code for a given prefix in the CURRENT
 * (server-clock) year, in the form `PREFIX-YYYY-0001`. The year is derived from
 * the function host clock so it can't be skewed by a client's device clock.
 *
 * Because sequences are zero-padded to 4 digits, lexicographic ordering matches
 * numeric ordering, so `orderDesc` + `limit(1)` yields the highest existing code.
 */
async function computeNextProjectCode(dbs, databaseId, prefixCode) {
  const year = new Date().getFullYear();
  const base = `${prefixCode}-${year}-`;

  const existing = await dbs.listDocuments(databaseId, PROJECTS_COLLECTION_ID, [
    Query.startsWith('project_code', base),
    Query.orderDesc('project_code'),
    Query.limit(1),
  ]);

  let seq = 1;
  if (existing.documents.length > 0) {
    const last = existing.documents[0].project_code || '';
    const parsed = parseInt(last.slice(base.length), 10);
    if (!Number.isNaN(parsed)) seq = parsed + 1;
  }

  if (seq > 9999) {
    throw new Error(`Sequence limit reached for ${prefixCode}-${year} (max 9999).`);
  }

  return `${base}${String(seq).padStart(4, '0')}`;
}

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

  const isBypassAdminRoute =
    (method === 'GET' && path === '/projects/next-id') ||
    (method === 'POST' && path === '/projects/create') ||
    (method === 'POST' && path === '/maps/resolve');

  if (
    callerPrefs.role !== 'admin' &&
    !(method === 'GET' && path === '/users') &&
    !(method === 'POST' && path === '/projects/assign') &&
    !isBypassAdminRoute
  ) {
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
        const role = resolveTeamRole(t);
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
      const searchVal = (query.search || '').trim().toLowerCase();

      const result = await teams.listMemberships(
        match[1],
        [Query.orderDesc('$createdAt'), Query.limit(100)]
      );
      
      // Perform in-memory search filtering by name and email
      let filteredMemberships = result.memberships;
      if (searchVal) {
        filteredMemberships = filteredMemberships.filter(m => {
          const userName = (m.userName || '').toLowerCase();
          const userEmail = (m.userEmail || '').toLowerCase();
          return userName.includes(searchVal) || userEmail.includes(searchVal);
        });
      }
      
      // Determine if each user has actually onboarded (by checking if password is set and email is verified)
      const membershipsWithConfirm = await Promise.all(
        filteredMemberships.map(async (m) => {
          let onboarded = false;
          try {
            const u = await users.get(m.userId);
            onboarded = !!u.passwordUpdate && u.emailVerification;
          } catch (e) {
            // Ignore, default to false
          }
          return {
            ...m,
            confirm: onboarded
          };
        })
      );

      return res.json({
        memberships: membershipsWithConfirm,
        total: membershipsWithConfirm.length
      });
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
          const url = `https://solarmaps.lk/onboarding?email=${encodeURIComponent(email)}`;
          const recoveryToken = await account.createRecovery(email, url);
          
          // Setup SMTP Transporter to send recovery/setup email manually
          const smtpUser = process.env.SMTP_USERNAME;
          const smtpPass = process.env.SMTP_PASSWORD;
          const smtpFrom = process.env.SMTP_FROM;
          if (!smtpUser || !smtpPass || !smtpFrom) {
            throw new Error('SMTP_USERNAME, SMTP_PASSWORD, or SMTP_FROM is not configured in the function environment variables');
          }
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: false, // TLS
            auth: {
              user: smtpUser,
              pass: smtpPass
            }
          });

          // Build onboarding link using the generated recovery secret
          const onboardingLink = `https://solarmaps.lk/onboarding?email=${encodeURIComponent(email)}&userId=${recoveryToken.userId}&secret=${recoveryToken.secret}`;

          const mailSubject = `[Solar Shine] Complete Your Account Setup`;
          const mailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8F8; padding: 40px 20px; text-align: center; color: #333;">
              <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); text-align: left;">
                <div style="margin-bottom: 24px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;">
                  <span style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: -0.5px;">Solar <span style="color: #FEC105;">Maps</span></span>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px; line-height: 1.25;">Complete Your Account Setup</h2>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">Hello <strong>${name || email}</strong>,</p>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 24px; line-height: 1.5;">You have been invited to join the Solar Shine team. Please click the button below to complete your account registration and set your password.</p>
                
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${onboardingLink}" style="display: inline-block; padding: 12px 28px; background-color: #FEC105; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.2s;">Set Up Account</a>
                </div>

                <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px; line-height: 1.5;">Or copy and paste this URL into your browser:</p>
                <p style="font-size: 13px; word-break: break-all; color: #2563EB; background-color: #F3F4F6; padding: 12px; border-radius: 6px; margin-bottom: 28px;">${onboardingLink}</p>
                
                <p style="font-size: 12px; color: #9CA3AF; margin: 0; border-top: 1px solid #F3F4F6; padding-top: 16px; line-height: 1.4;">
                  This is an automated notification. Please do not reply directly to this email.<br/>
                  &copy; ${new Date().getFullYear()} Solar Shine Team.
                </p>
              </div>
            </div>
          `;

          const mailOptions = {
            from: `"Solar Shine" <${smtpFrom}>`,
            to: email,
            subject: mailSubject,
            text: `Hello ${name || email},\n\nYou have been invited to join the Solar Shine team. Please set up your account by opening this link: ${onboardingLink}\n\nBest regards,\nSolar Shine Team`,
            html: mailHtml
          };

          await transporter.sendMail(mailOptions);
          emailSent = true;
        }
      } catch (e) {
        emailError = e.message;
        error(`Failed to send setup email: ${e.message}`);
      }

      return res.json({ membership, emailRequired, emailSent, emailError });
    }

    match = path.match(/^\/teams\/([^/]+)\/resend-invite$/);
    if (method === 'POST' && match) {
      const { email, redirectOrigin } = parseBody();
      if (!email) {
        return res.json({ error: 'Missing email' }, 400);
      }

      let emailSent = false;
      let emailError = null;
      try {
        const url = `https://solarmaps.lk/onboarding?email=${encodeURIComponent(email)}`;
        const recoveryToken = await account.createRecovery(email, url);

        const smtpUser = process.env.SMTP_USERNAME;
        const smtpPass = process.env.SMTP_PASSWORD;
        const smtpFrom = process.env.SMTP_FROM;
        if (!smtpUser || !smtpPass || !smtpFrom) {
          throw new Error('SMTP_USERNAME, SMTP_PASSWORD, or SMTP_FROM is not configured in the function environment variables');
        }

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: false, // TLS
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const onboardingLink = `https://solarmaps.lk/onboarding?email=${encodeURIComponent(email)}&userId=${recoveryToken.userId}&secret=${recoveryToken.secret}`;

        const mailSubject = `[Solar Shine] Complete Your Account Setup`;
        const mailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8F8; padding: 40px 20px; text-align: center; color: #333;">
            <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); text-align: left;">
              <div style="margin-bottom: 24px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;">
                <span style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: -0.5px;">Solar <span style="color: #FEC105;">Maps</span></span>
              </div>
              
              <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px; line-height: 1.25;">Complete Your Account Setup</h2>
              <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">Hello,</p>
              <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 24px; line-height: 1.5;">You have been invited to join the Solar Shine team. Please click the button below to complete your account registration and set your password.</p>
              
              <div style="text-align: center; margin-bottom: 28px;">
                <a href="${onboardingLink}" style="display: inline-block; padding: 12px 28px; background-color: #FEC105; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.2s;">Set Up Account</a>
              </div>

              <p style="font-size: 14px; color: #6B7280; margin-bottom: 24px; line-height: 1.5;">Or copy and paste this URL into your browser:</p>
              <p style="font-size: 13px; word-break: break-all; color: #2563EB; background-color: #F3F4F6; padding: 12px; border-radius: 6px; margin-bottom: 28px;">${onboardingLink}</p>
              
              <p style="font-size: 12px; color: #9CA3AF; margin: 0; border-top: 1px solid #F3F4F6; padding-top: 16px; line-height: 1.4;">
                This is an automated notification. Please do not reply directly to this email.<br/>
                &copy; ${new Date().getFullYear()} Solar Shine Team.
              </p>
            </div>
          </div>
        `;

        const mailOptions = {
          from: `"Solar Shine" <${smtpFrom}>`,
          to: email,
          subject: mailSubject,
          text: `Hello,\n\nYou have been invited to join the Solar Shine team. Please set up your account by opening this link: ${onboardingLink}\n\nBest regards,\nSolar Shine Team`,
          html: mailHtml
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (e) {
        emailError = e.message;
        error(`Failed to resend setup email: ${e.message}`);
      }

      return res.json({ emailSent, emailError });
    }

    match = path.match(/^\/teams\/([^/]+)\/memberships\/([^/]+)$/);
    if (method === 'DELETE' && match) {
      await teams.deleteMembership(match[1], match[2]);
      return res.json({ success: true });
    }

    if (method === 'POST' && path === '/maps/resolve') {
      const { url } = parseBody();
      if (!url) {
        return res.json({ error: 'Missing url' }, 400);
      }

      async function resolveFinalUrl(currentUrl, depth = 0) {
        if (depth > 5) return currentUrl;
        try {
          const nextUrl = await new Promise((resolve) => {
            const client = currentUrl.startsWith('https') ? https : http;
            const req = client.request(currentUrl, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, (response) => {
              if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                resolve(response.headers.location);
              } else {
                resolve(null);
              }
            });
            req.on('error', () => resolve(null));
            req.end();
          });
          if (nextUrl) {
            const absoluteUrl = nextUrl.startsWith('http') ? nextUrl : new URL(nextUrl, currentUrl).toString();
            return resolveFinalUrl(absoluteUrl, depth + 1);
          }
        } catch (err) {
          // Ignore
        }
        return currentUrl;
      }

      try {
        const finalUrl = await resolveFinalUrl(url);
        const coords = serverParseCoordinates(finalUrl);
        if (coords) {
          return res.json({ success: true, lat: coords.lat, lng: coords.lng, resolvedUrl: finalUrl });
        } else {
          return res.json({ success: false, error: 'Could not extract coordinates from resolved URL' }, 400);
        }
      } catch (err) {
        return res.json({ success: false, error: err.message }, 500);
      }
    }

    // Preview the next project code for a prefix. Non-authoritative: the final
    // code is assigned atomically at creation time (POST /projects/create).
    if (method === 'GET' && path === '/projects/next-id') {
      const prefixCode = (query.prefix || '').trim();
      if (!prefixCode) {
        return res.json({ error: 'Missing prefix' }, 400);
      }
      const dbs = new Databases(client);
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '6873ba790033a7d5cfdb';
      const projectCode = await computeNextProjectCode(dbs, databaseId, prefixCode);
      return res.json({ projectCode });
    }

    // Authoritatively generate a project code and create the project in one
    // server-side step. The unique index on `project_code` rejects any colliding
    // code produced by a concurrent create; on conflict we regenerate and retry.
    if (method === 'POST' && path === '/projects/create') {
      const body = parseBody();
      const { prefixCode, ...projectData } = body;
      if (!prefixCode) {
        return res.json({ error: 'Missing prefixCode' }, 400);
      }

      const dbs = new Databases(client);
      const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || '6873ba790033a7d5cfdb';

      const MAX_ATTEMPTS = 5;
      let lastError;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const projectCode = await computeNextProjectCode(dbs, databaseId, prefixCode);
        try {
          const created = await dbs.createDocument(databaseId, PROJECTS_COLLECTION_ID, ID.unique(), {
            ...projectData,
            name: projectData.name || '',
            prefix_code: prefixCode,
            project_code: projectCode,
          });
          return res.json(created);
        } catch (e) {
          // 409 = unique-index conflict from a concurrent create; regenerate + retry.
          if (e.code === 409) {
            lastError = e;
            continue;
          }
          throw e;
        }
      }
      error(`Failed to allocate a unique project code after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
      return res.json({ error: 'Could not allocate a unique project code, please retry.' }, 409);
    }

    if (method === 'POST' && path === '/projects/assign') {
      const { assignees, projectName, origin, type, projectId, visitTitle } = parseBody();
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
      const smtpUser = process.env.SMTP_USERNAME;
      const smtpPass = process.env.SMTP_PASSWORD;
      const smtpFrom = process.env.SMTP_FROM;
      if (!smtpUser || !smtpPass || !smtpFrom) {
        throw new Error('SMTP_USERNAME, SMTP_PASSWORD, or SMTP_FROM is not configured in the function environment variables');
      }
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false, // TLS
        auth: {
          user: smtpUser,
          pass: smtpPass
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
                  role = resolveTeamRole(t);
                  if (role) break;
                }
              }
            } catch (err) {
              error(`Failed to resolve team role during notification for ${email}: ${err.message}`);
            }
          }

          // Choose correct path based on resolved role
          const targetPath = ROLE_HOME_PATH[role] ?? '/admin';

          const isSiteVisit = type === 'site_visit';
          let inAppLink = targetPath;
          let emailLink = '';

          if (isSiteVisit) {
            const queryParams = `?tab=site-visits&project=${projectId || ''}&myVisits=true`;
            inAppLink = `${targetPath}${queryParams}`;
            emailLink = origin ? `${origin.replace(/\/$/, '')}${targetPath}${queryParams}` : '';
          } else {
            const queryParams = projectId ? `/project-summary/${projectId}` : targetPath;
            inAppLink = queryParams;
            emailLink = origin ? `${origin.replace(/\/$/, '')}${queryParams}` : '';
          }

          // 2. Create database notification document with markdown bold for project name
          const notifTitle = isSiteVisit ? 'New Site Visit Assignment' : 'New Project Assignment';
          const notifContent = isSiteVisit
            ? `You have been assigned to the site visit: **${visitTitle || projectName}** (Project: **${projectName}**)`
            : `You have been assigned to the project: **${projectName}**`;

          await dbs.createDocument(
            databaseId,
            'notifications',
            ID.unique(),
            {
              user_id: userId,
              title: notifTitle,
              content: notifContent,
              read: false,
              link: inAppLink
            }
          );

          // 3. Send notification email
          const mailSubject = isSiteVisit
            ? `[Solar Shine] Assigned to Site Visit: ${visitTitle || projectName}`
            : `[Solar Shine] Assigned to Project: ${projectName}`;

          const mailHtml = isSiteVisit ? `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8F8; padding: 40px 20px; text-align: center; color: #333;">
              <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); text-align: left;">
                <div style="margin-bottom: 24px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;">
                  <span style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: -0.5px;">Solar <span style="color: #FEC105;">Maps</span></span>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px; line-height: 1.25;">New Site Visit Assignment</h2>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">Hello <strong>${userName}</strong>,</p>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 24px; line-height: 1.5;">You have been assigned to a new site visit: <strong style="color: #111827;">${visitTitle || projectName}</strong>.</p>
                
                <div style="background-color: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 4px 0; color: #6B7280; width: 120px; font-weight: 500;">Site Visit:</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600;">${visitTitle || projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6B7280; font-weight: 500;">Project:</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6B7280; font-weight: 500;">Assigned To:</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600;">${userName}</td>
                    </tr>
                  </table>
                </div>

                ${emailLink ? `
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${emailLink}" style="display: inline-block; padding: 12px 28px; background-color: #FEC105; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.2s;">View Site Visit</a>
                </div>
                ` : ''}

                <p style="font-size: 12px; color: #9CA3AF; margin: 0; border-top: 1px solid #F3F4F6; padding-top: 16px; line-height: 1.4;">
                  This is an automated notification. Please do not reply directly to this email.<br/>
                  &copy; ${new Date().getFullYear()} Solar Shine Team.
                </p>
              </div>
            </div>
          ` : `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F8F8; padding: 40px 20px; text-align: center; color: #333;">
              <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); text-align: left;">
                <div style="margin-bottom: 24px; border-bottom: 1px solid #F3F4F6; padding-bottom: 16px;">
                  <span style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: -0.5px;">Solar <span style="color: #FEC105;">Maps</span></span>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 12px; line-height: 1.25;">New Project Assignment</h2>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">Hello <strong>${userName}</strong>,</p>
                <p style="font-size: 15px; color: #4B5563; margin-top: 0; margin-bottom: 24px; line-height: 1.5;">You have been assigned to a new project: <strong style="color: #111827;">${projectName}</strong>.</p>
                
                <div style="background-color: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                      <td style="padding: 4px 0; color: #6B7280; width: 120px; font-weight: 500;">Project Name:</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; color: #6B7280; font-weight: 500;">Assigned To:</td>
                      <td style="padding: 4px 0; color: #111827; font-weight: 600;">${userName}</td>
                    </tr>
                  </table>
                </div>

                ${emailLink ? `
                <div style="text-align: center; margin-bottom: 28px;">
                  <a href="${emailLink}" style="display: inline-block; padding: 12px 28px; background-color: #FEC105; color: #000000; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; transition: background-color 0.2s;">View Project Details</a>
                </div>
                ` : ''}

                <p style="font-size: 12px; color: #9CA3AF; margin: 0; border-top: 1px solid #F3F4F6; padding-top: 16px; line-height: 1.4;">
                  This is an automated notification. Please do not reply directly to this email.<br/>
                  &copy; ${new Date().getFullYear()} Solar Shine Team.
                </p>
              </div>
            </div>
          `;

          const mailOptions = {
            from: `"Solar Shine" <${smtpFrom}>`,
            to: email,
            subject: mailSubject,
            text: isSiteVisit
              ? `Hello ${userName},\n\nYou have been assigned to the site visit "${visitTitle || projectName}" (Project: "${projectName}") on Solar Shine.\n\nYou can view it here: ${emailLink || 'in your dashboard'}\n\nBest regards,\nSolar Shine Team`
              : `Hello ${userName},\n\nYou have been assigned to the project "${projectName}" on Solar Shine.\n\nYou can view and access the project execution details here: ${emailLink || 'in your dashboard'}\n\nBest regards,\nSolar Shine Team`,
            html: mailHtml
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

function serverParseCoordinates(link) {
  if (!link) return null;
  const cleanLink = link.trim();
  
  const qMatch = cleanLink.match(/[?&](q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/) || cleanLink.match(/(q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[2]);
    const lng = parseFloat(qMatch[3]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const atMatch = cleanLink.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const placeMatch = cleanLink.match(/\/place\/([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const pathMatch = cleanLink.match(/\/([+-]?\d+\.\d+),\+?([+-]?\d+\.\d+)/) || cleanLink.match(/\/([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1]);
    const lng = parseFloat(pathMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  const rawMatch = cleanLink.match(/^([+-]?\d+\.\d+)\s*,\s*([+-]?\d+\.\d+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }

  return null;
}
