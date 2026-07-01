import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env variables
import 'dotenv/config';

const PORT = 4002;

// Resolve paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read appwrite.json to find functions configuration
const appwriteJsonPath = path.resolve(__dirname, 'appwrite.json');
let appwriteConfig = {};
try {
  appwriteConfig = JSON.parse(fs.readFileSync(appwriteJsonPath, 'utf8'));
} catch (err) {
  console.warn(`[Warning] Could not read appwrite.json: ${err.message}`);
}

const functionsConfig = appwriteConfig.functions || [];

// Helper to write JSON response
const sendJson = (res, statusCode, data, extraHeaders = {}) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-appwrite-user-id, x-appwrite-key',
    ...extraHeaders
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, x-appwrite-user-id, x-appwrite-key',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let bodyData = '';
    req.on('data', chunk => {
      bodyData += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyData);
        const { functionId, body, path: reqPath, method: reqMethod, headers: reqHeaders } = payload;

        console.log(`\n[Execution] Triggered function: "${functionId}" for path "${reqPath || '/'}" [${reqMethod || 'GET'}]`);

        // Find function configuration
        const funcConfig = functionsConfig.find(f => f.$id === functionId);
        let entrypointPath = '';

        if (funcConfig) {
          entrypointPath = path.resolve(__dirname, funcConfig.path, funcConfig.entrypoint);
        } else {
          // Fallback guess
          entrypointPath = path.resolve(__dirname, 'functions', functionId, 'src', 'main.js');
        }

        if (!fs.existsSync(entrypointPath)) {
          return sendJson(res, 404, { error: `Function entrypoint not found at ${entrypointPath}` });
        }

        // Set Appwrite environment variables
        process.env.APPWRITE_FUNCTION_API_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'http://localhost/v1';
        process.env.APPWRITE_FUNCTION_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
        // Also ensure the APPWRITE_API_KEY is available (from process.env, local env or dotenv)
        const apiKey = process.env.APPWRITE_API_KEY || process.env.LOCAL_APPWRITE_API_KEY || '';
        process.env.APPWRITE_FUNCTION_API_KEY = apiKey;
        
        // Inject SMTP configuration for email notifications
        process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
        process.env.SMTP_PORT = process.env.SMTP_PORT || '587';
        process.env.SMTP_USERNAME = process.env.SMTP_USERNAME || '';
        process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';

        // Inject the x-appwrite-key header using the process API key if it wasn't sent from the client
        const mergedHeaders = {
          'x-appwrite-key': apiKey,
          ...reqHeaders
        };

        // Prepare request parameters for the function
        const logs = [];
        const errors = [];

        const functionReq = {
          bodyRaw: body || '',
          bodyText: body || '',
          get bodyJson() {
            try {
              return JSON.parse(this.bodyRaw);
            } catch {
              return {};
            }
          },
          headers: mergedHeaders,
          method: reqMethod || 'GET',
          host: 'localhost',
          scheme: 'http',
          port: String(PORT),
          path: reqPath ? reqPath.split('?')[0] : '/',
          queryString: reqPath ? reqPath.split('?')[1] || '' : '',
          get query() {
            if (!reqPath) return {};
            try {
              const url = new URL(reqPath, 'http://localhost');
              return Object.fromEntries(url.searchParams.entries());
            } catch {
              return {};
            }
          }
        };

        let responseSent = false;
        let resolveResponse;
        const responsePromise = new Promise((resolve) => {
          resolveResponse = resolve;
        });

        const functionRes = {
          json(obj, status = 200, headers = {}) {
            if (responseSent) return;
            responseSent = true;
            resolveResponse({ type: 'json', body: JSON.stringify(obj), status, headers });
          },
          text(text, status = 200, headers = {}) {
            if (responseSent) return;
            responseSent = true;
            resolveResponse({ type: 'text', body: text, status, headers });
          },
          empty() {
            if (responseSent) return;
            responseSent = true;
            resolveResponse({ type: 'empty', body: '', status: 204, headers: {} });
          },
          binary(bytes, status = 200, headers = {}) {
            if (responseSent) return;
            responseSent = true;
            resolveResponse({ type: 'binary', body: bytes, status, headers });
          },
          redirect(url, status = 301, headers = {}) {
            if (responseSent) return;
            responseSent = true;
            resolveResponse({ type: 'redirect', body: url, status, headers: { ...headers, Location: url } });
          }
        };

        const functionLog = (...args) => {
          const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
          console.log(`[${functionId} Log]`, msg);
          logs.push(msg);
        };

        const functionError = (...args) => {
          const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
          console.error(`[${functionId} Error]`, msg);
          errors.push(msg);
        };

        // Dynamically import the function entrypoint
        const entrypointUrl = `file://${entrypointPath}?t=${Date.now()}`;
        const { default: handler } = await import(entrypointUrl);

        // Execute the handler
        try {
          await handler({
            req: functionReq,
            res: functionRes,
            log: functionLog,
            error: functionError
          });
        } catch (handlerErr) {
          functionError(`Handler execution failed: ${handlerErr.stack || handlerErr.message}`);
          if (!responseSent) {
            functionRes.json({ error: handlerErr.message }, 500);
          }
        }

        // Wait for response to be sent by the handler
        const result = await responsePromise;

        // Construct Appwrite Execution model response
        const executionResponse = {
          $id: `loc-${Date.now().toString(36)}`,
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          functionId,
          trigger: 'http',
          status: result.status >= 400 ? 'failed' : 'completed',
          requestStatusCode: 200,
          responseStatusCode: result.status,
          responseBody: result.body,
          logs: logs.join('\n'),
          errors: errors.join('\n'),
          duration: 0.1
        };

        sendJson(res, 200, executionResponse);

      } catch (err) {
        console.error('[Error] Execution runner error:', err);
        sendJson(res, 500, { error: err.message });
      }
    });
    return;
  }

  // Not found
  sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Local Appwrite Function Runner running on port ${PORT}`);
  console.log(`Watching for code changes in functions/ to hot-reload...`);
  console.log(`==================================================\n`);
});
