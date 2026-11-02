/**
 * Hospitrack — Pure Node.js Web Server (Zero-Dependency)
 * Serves the web application and orchestrates the Spring Boot backend
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.PORT, 10) || 8000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml; charset=utf-8'
};

const rawBackendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || '';
let BACKEND_IS_HTTPS = false;
let BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
let BACKEND_PORT = parseInt(process.env.BACKEND_PORT, 10) || 8080;
let BACKEND_PATH_PREFIX = '';
let IS_REMOTE_BACKEND = false;

if (rawBackendUrl) {
  try {
    const parsed = new URL(rawBackendUrl);
    BACKEND_IS_HTTPS = parsed.protocol === 'https:';
    BACKEND_HOST = parsed.hostname;
    BACKEND_PORT = parsed.port ? parseInt(parsed.port, 10) : (BACKEND_IS_HTTPS ? 443 : 80);
    BACKEND_PATH_PREFIX = parsed.pathname.replace(/\/+$/, '');
    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      IS_REMOTE_BACKEND = true;
    }
  } catch (e) {
    console.warn(`[Config] Unable to parse BACKEND_URL "${rawBackendUrl}":`, e.message);
  }
}

/**
 * Normalizes PostgreSQL connection URLs for Spring Boot / JDBC compatibility.
 * Safely parses Supabase / PostgreSQL URIs, URL-encoded credentials, special characters,
 * and strips literal unresolved placeholders such as "${DATABASE_URL}".
 */
function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return { valid: false };
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('${') || trimmed.startsWith('$')) {
    return { valid: false, isPlaceholder: true, raw: trimmed };
  }

  let username = '';
  let password = '';
  let host = 'localhost';
  let port = '5432';
  let dbName = 'postgres';
  const queryParams = new Map();

  if (trimmed.toLowerCase().startsWith('jdbc:h2:')) {
    return {
      valid: true,
      jdbcUrl: trimmed,
      username: 'sa',
      password: '',
      host: 'localhost',
      port: 'mem',
      dbName: 'h2',
      isH2: true
    };
  }

  if (trimmed.toLowerCase().startsWith('jdbc:postgresql:')) {
    let remainder = trimmed.slice('jdbc:postgresql:'.length);
    if (remainder.startsWith('//')) {
      remainder = remainder.slice(2);
    }
    const qIdx = remainder.indexOf('?');
    let queryStr = '';
    if (qIdx !== -1) {
      queryStr = remainder.slice(qIdx + 1);
      remainder = remainder.slice(0, qIdx);
    }
    if (queryStr) {
      for (const part of queryStr.split('&')) {
        const eq = part.indexOf('=');
        if (eq !== -1) {
          queryParams.set(part.slice(0, eq), part.slice(eq + 1));
        } else if (part) {
          queryParams.set(part, '');
        }
      }
    }
    const slashIdx = remainder.indexOf('/');
    if (slashIdx !== -1) {
      dbName = remainder.slice(slashIdx + 1) || 'postgres';
      remainder = remainder.slice(0, slashIdx);
    }
    const atIdx = remainder.lastIndexOf('@');
    if (atIdx !== -1) {
      const userInfo = remainder.slice(0, atIdx);
      remainder = remainder.slice(atIdx + 1);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx !== -1) {
        username = decodeURIComponent(userInfo.slice(0, colonIdx));
        try { password = decodeURIComponent(userInfo.slice(colonIdx + 1)); }
        catch (e) { password = userInfo.slice(colonIdx + 1); }
      } else {
        username = decodeURIComponent(userInfo);
      }
    }
    const colonIdx = remainder.lastIndexOf(':');
    if (colonIdx !== -1) {
      host = remainder.slice(0, colonIdx);
      port = remainder.slice(colonIdx + 1);
    } else if (remainder) {
      host = remainder;
    }
  } else if (/^postgres(?:ql)?:\/\//i.test(trimmed)) {
    let remainder = trimmed.replace(/^postgres(?:ql)?:\/\//i, '');
    const qIdx = remainder.indexOf('?');
    let queryStr = '';
    if (qIdx !== -1) {
      queryStr = remainder.slice(qIdx + 1);
      remainder = remainder.slice(0, qIdx);
    }
    if (queryStr) {
      for (const part of queryStr.split('&')) {
        const eq = part.indexOf('=');
        if (eq !== -1) {
          queryParams.set(part.slice(0, eq), part.slice(eq + 1));
        } else if (part) {
          queryParams.set(part, '');
        }
      }
    }
    const slashIdx = remainder.indexOf('/');
    if (slashIdx !== -1) {
      dbName = remainder.slice(slashIdx + 1) || 'postgres';
      remainder = remainder.slice(0, slashIdx);
    }
    const atIdx = remainder.lastIndexOf('@');
    if (atIdx !== -1) {
      const userInfo = remainder.slice(0, atIdx);
      remainder = remainder.slice(atIdx + 1);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx !== -1) {
        username = decodeURIComponent(userInfo.slice(0, colonIdx));
        try { password = decodeURIComponent(userInfo.slice(colonIdx + 1)); }
        catch (e) { password = userInfo.slice(colonIdx + 1); }
      } else {
        username = decodeURIComponent(userInfo);
      }
    }
    const colonIdx = remainder.lastIndexOf(':');
    if (colonIdx !== -1) {
      host = remainder.slice(0, colonIdx);
      port = remainder.slice(colonIdx + 1);
    } else if (remainder) {
      host = remainder;
    }
  } else {
    return { valid: false, raw: trimmed };
  }

  if (queryParams.has('user') && !username) {
    username = decodeURIComponent(queryParams.get('user'));
    queryParams.delete('user');
  } else {
    queryParams.delete('user');
  }

  if (queryParams.has('password') && !password) {
    password = decodeURIComponent(queryParams.get('password'));
    queryParams.delete('password');
  } else {
    queryParams.delete('password');
  }

  if (host.includes('supabase') && !queryParams.has('sslmode')) {
    queryParams.set('sslmode', 'require');
  }
  if (port === '6543' && !queryParams.has('prepareThreshold')) {
    queryParams.set('prepareThreshold', '0');
  }

  const queryParts = [];
  for (const [k, v] of queryParams.entries()) {
    queryParts.push(v ? `${k}=${v}` : k);
  }
  const search = queryParts.length ? '?' + queryParts.join('&') : '';
  const jdbcUrl = `jdbc:postgresql://${host}:${port}/${dbName}${search}`;

  return {
    valid: true,
    jdbcUrl,
    username,
    password,
    host,
    port,
    dbName,
    isH2: false
  };
}

/**
 * Discovers database connection parameters across all common environment variables.
 */
function resolveDatabaseConfig() {
  const candidateKeys = [
    'DATABASE_URL',
    'SPRING_DATASOURCE_URL',
    'SUPABASE_DATABASE_URL',
    'POSTGRES_URL',
    'POSTGRESQL_URL',
    'DB_URL',
    'JDBC_DATABASE_URL'
  ];

  let rawUrl = '';
  let foundKey = '';
  for (const key of candidateKeys) {
    const val = process.env[key];
    if (val && typeof val === 'string' && val.trim() && !val.trim().startsWith('${') && !val.trim().startsWith('$')) {
      rawUrl = val.trim();
      foundKey = key;
      break;
    }
  }

  const normalized = normalizeDatabaseUrl(rawUrl);

  const finalUsername = process.env.DB_USERNAME || process.env.DATABASE_USERNAME || process.env.SPRING_DATASOURCE_USERNAME || normalized.username || '';
  const finalPassword = process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || process.env.SPRING_DATASOURCE_PASSWORD || normalized.password || '';

  return {
    ...normalized,
    foundKey,
    username: finalUsername,
    password: finalPassword
  };
}

function checkBackendHealth(host, port) {
  return new Promise((resolve) => {
    const client = BACKEND_IS_HTTPS ? https : http;
    const req = client.request({
      hostname: host,
      port: port,
      path: BACKEND_PATH_PREFIX ? `${BACKEND_PATH_PREFIX}/api/health` : '/api/health',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  // CORS & Security Headers
  const requestOrigin = req.headers.origin;
  const configuredOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  let allowOrigin = '*';
  if (requestOrigin) {
    const normOrigin = requestOrigin.replace(/\/+$/, '');
    if (configuredOrigins.length > 0) {
      if (configuredOrigins.includes(normOrigin)) {
        allowOrigin = requestOrigin;
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    } else {
      allowOrigin = requestOrigin;
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, Pragma');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);

  // Dedicated container health check endpoint (Render / orchestrators)
  if (reqPath === '/health') {
    const isHealthy = await checkBackendHealth(BACKEND_HOST, BACKEND_PORT);
    res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: isHealthy ? 'UP' : 'INITIALIZING',
      service: 'hospitrack-platform',
      frontend: 'UP',
      backend: isHealthy ? 'UP' : 'INITIALIZING',
      port: PORT,
      backendPort: BACKEND_PORT,
      timestamp: Date.now()
    }));
    return;
  }

  // Runtime environment configuration for frontend client
  if (reqPath === '/env-config.js') {
    const publicEnv = {
      API_BASE_URL: process.env.API_BASE_URL || (IS_REMOTE_BACKEND ? rawBackendUrl : ''),
      NODE_ENV: process.env.NODE_ENV || 'production'
    };
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end(`window.__ENV__ = Object.assign(window.__ENV__ || {}, ${JSON.stringify(publicEnv)});`);
    return;
  }

  if (reqPath === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: {
        apiBaseUrl: process.env.API_BASE_URL || (IS_REMOTE_BACKEND ? rawBackendUrl : ''),
        appName: 'Hospitrack',
        environment: process.env.NODE_ENV || 'production'
      }
    }));
    return;
  }

  // Proxy /api/* requests to Spring Boot backend
  if (reqPath.startsWith('/api/') || reqPath === '/api') {
    const targetPath = BACKEND_PATH_PREFIX ? `${BACKEND_PATH_PREFIX}${req.url}` : req.url;
    const client = BACKEND_IS_HTTPS ? https : http;
    const proxyHeaders = {
      ...req.headers,
      host: (BACKEND_IS_HTTPS && BACKEND_PORT === 443) || (!BACKEND_IS_HTTPS && BACKEND_PORT === 80)
        ? BACKEND_HOST
        : `${BACKEND_HOST}:${BACKEND_PORT}`,
      'x-forwarded-host': req.headers.host || `${HOST}:${PORT}`,
      'x-forwarded-proto': req.connection?.encrypted ? 'https' : 'http',
      'x-forwarded-for': req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
    };

    const proxyReq = client.request({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: targetPath,
      method: req.method,
      headers: proxyHeaders
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: 'Unable to connect to Hospitrack API services. Please ensure the backend server is running.'
      }));
    });

    req.pipe(proxyReq, { end: true });
    return;
  }

  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const filePath = path.normalize(path.join(PUBLIC_DIR, reqPath));

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end();
        return;
      }

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('500 Server Error');
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
        }
      });
      return;
    }

    // Static asset requests (with a file extension or located in static asset folders)
    // must return genuine 404 responses and NEVER fall back to index.html
    const ext = path.extname(reqPath).toLowerCase();
    const isStaticAsset = ext !== '' ||
      reqPath.startsWith('/css/') ||
      reqPath.startsWith('/js/') ||
      reqPath.startsWith('/assets/') ||
      reqPath.startsWith('/runtime/') ||
      reqPath.startsWith('/data/');

    if (isStaticAsset) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: Static asset '${reqPath}' does not exist.`);
      return;
    }

    // SPA client-side routing fallback for HTML navigation requests (GET / HEAD only)
    if (req.method === 'GET' || req.method === 'HEAD') {
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      if (req.method === 'HEAD') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end();
        return;
      }
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    // Non-GET/HEAD request on non-existent route
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please free port ${PORT} or set PORT environment variable.`);
  } else {
    console.error('Server error:', err);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

let backendProcess = null;

async function waitForBackendReady(maxWaitMs = 60000) {
  process.stdout.write('  [Backend] Waiting for Spring Boot health probe');
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await checkBackendHealth(BACKEND_HOST, BACKEND_PORT)) {
      console.log('\n  [Backend] Spring Boot API is healthy and accepting traffic.');
      return true;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`\n  [Backend] Note: Backend did not report ready within ${maxWaitMs / 1000}s; requests will proxy as soon as initialization completes.`);
  return false;
}

async function ensureBackendRunning() {
  if (IS_REMOTE_BACKEND) {
    const isHealthy = await checkBackendHealth(BACKEND_HOST, BACKEND_PORT);
    console.log(`  Backend API:  ${BACKEND_IS_HTTPS ? 'https' : 'http'}://${BACKEND_HOST}:${BACKEND_PORT}${BACKEND_PATH_PREFIX} (${isHealthy ? 'Operational' : 'Probing remote backend'})`);
    return;
  }

  const isHealthy = await checkBackendHealth(BACKEND_HOST, BACKEND_PORT);
  if (isHealthy) {
    console.log(`  Backend API:  http://${BACKEND_HOST}:${BACKEND_PORT} (Operational)`);
    return;
  }

  const candidateJarPaths = [
    process.env.JAR_PATH,
    path.join(__dirname, 'backend', 'target', 'hospitrack-backend-1.0.0.jar'),
    path.join(__dirname, 'hospitrack-backend-1.0.0.jar'),
    path.join(__dirname, 'app.jar'),
    path.join(__dirname, 'backend.jar')
  ].filter(Boolean);

  let jarPath = null;
  for (const candidate of candidateJarPaths) {
    if (fs.existsSync(candidate)) {
      jarPath = candidate;
      break;
    }
  }

  if (!jarPath) {
    console.log('  [Backend] Spring Boot JAR not found in candidate paths:');
    candidateJarPaths.forEach(p => console.log(`    - ${p}`));
    console.log('  [Backend] For local development: cd backend && mvnw clean package -DskipTests');
    return;
  }

  const dbConfig = resolveDatabaseConfig();
  const springProfile = process.env.SPRING_PROFILES_ACTIVE || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

  const backendEnv = {
    ...process.env,
    PORT: String(BACKEND_PORT),
    SERVER_PORT: String(BACKEND_PORT),
    SPRING_PROFILES_ACTIVE: springProfile
  };

  // If a valid database configuration was resolved, inject clean variables
  if (dbConfig.valid && dbConfig.jdbcUrl) {
    backendEnv.DATABASE_URL = dbConfig.jdbcUrl;
    backendEnv.SPRING_DATASOURCE_URL = dbConfig.jdbcUrl;
    if (dbConfig.username) {
      backendEnv.DB_USERNAME = dbConfig.username;
      backendEnv.DATABASE_USERNAME = dbConfig.username;
      backendEnv.SPRING_DATASOURCE_USERNAME = dbConfig.username;
    }
    if (dbConfig.password) {
      backendEnv.DB_PASSWORD = dbConfig.password;
      backendEnv.DATABASE_PASSWORD = dbConfig.password;
      backendEnv.SPRING_DATASOURCE_PASSWORD = dbConfig.password;
    }
  } else {
    // Prevent literal unresolved placeholders such as "${DATABASE_URL}" from polluting Spring Boot
    if (backendEnv.DATABASE_URL && (backendEnv.DATABASE_URL.startsWith('${') || backendEnv.DATABASE_URL.startsWith('$'))) {
      delete backendEnv.DATABASE_URL;
    }
    if (backendEnv.SPRING_DATASOURCE_URL && (backendEnv.SPRING_DATASOURCE_URL.startsWith('${') || backendEnv.SPRING_DATASOURCE_URL.startsWith('$'))) {
      delete backendEnv.SPRING_DATASOURCE_URL;
    }
    if (springProfile === 'prod') {
      console.warn('======================================================================');
      console.warn('  [Backend] NOTICE: No valid external PostgreSQL URL configured.');
      console.warn('  [Backend] Please set DATABASE_URL in your Render Web Service settings.');
      console.warn('  [Backend] Example: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require');
      console.warn('======================================================================');
    }
  }

  // Optimized memory profile for Render Free 512MB cgroup limit
  const defaultJavaOpts = [
    '-Xms96m',
    '-Xmx256m',
    '-XX:MaxMetaspaceSize=112m',
    '-XX:ReservedCodeCacheSize=48m',
    '-Xss512k',
    '-XX:+UseSerialGC'
  ];

  const javaOpts = process.env.JAVA_OPTS
    ? process.env.JAVA_OPTS.split(' ').filter(Boolean)
    : defaultJavaOpts;

  const javaArgs = [
    ...javaOpts,
    `-Dserver.port=${BACKEND_PORT}`,
    `-Dspring.profiles.active=${springProfile}`,
    '-jar',
    jarPath,
    `--server.port=${BACKEND_PORT}`,
    `--spring.profiles.active=${springProfile}`
  ];

  // Pass validated database parameters directly to Spring Boot via CLI arguments & System Properties
  if (dbConfig.valid && dbConfig.jdbcUrl) {
    javaArgs.push(`-Dspring.datasource.url=${dbConfig.jdbcUrl}`);
    javaArgs.push(`--spring.datasource.url=${dbConfig.jdbcUrl}`);

    if (dbConfig.username) {
      javaArgs.push(`-Dspring.datasource.username=${dbConfig.username}`);
      javaArgs.push(`--spring.datasource.username=${dbConfig.username}`);
    }
    if (dbConfig.password) {
      javaArgs.push(`-Dspring.datasource.password=${dbConfig.password}`);
      javaArgs.push(`--spring.datasource.password=${dbConfig.password}`);
    }

    const maskedUser = dbConfig.username
      ? (dbConfig.username.length > 4 ? dbConfig.username.slice(0, 4) + '***' : '***')
      : 'default';
    console.log(`  [Backend] Database Target: ${dbConfig.jdbcUrl}`);
    console.log(`  [Backend] Database User:   ${maskedUser} (Credentials configured: ${dbConfig.password ? 'YES' : 'NO'})`);
  }

  console.log(`  [Backend] Launching Spring Boot (${springProfile}) on port ${BACKEND_PORT}...`);
  backendProcess = spawn('java', javaArgs, {
    cwd: __dirname,
    env: backendEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(`  [Spring Boot] ${msg}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(`  [Spring Boot Error] ${msg}`);
  });

  backendProcess.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.log(`  [Backend] Process exited with code ${code}${signal ? ' (signal: ' + signal + ')' : ''}`);
    }
    backendProcess = null;
  });

  await waitForBackendReady(60000);
}

function handleProcessExit(signal) {
  console.log(`\nReceived ${signal || 'exit'}, terminating Hospitrack processes gracefully...`);
  if (backendProcess) {
    try {
      backendProcess.kill('SIGTERM');
    } catch (e) {}
    backendProcess = null;
  }
  process.exit(0);
}

process.on('SIGINT', () => handleProcessExit('SIGINT'));
process.on('SIGTERM', () => handleProcessExit('SIGTERM'));

if (require.main === module) {
  server.listen(PORT, HOST, async () => {
    console.log('====================================================');
    console.log('  HOSPITRACK HEALTHCARE PLATFORM LIVE');
    console.log(`  Frontend URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`  Proxy Target: http://${BACKEND_HOST}:${BACKEND_PORT}`);
    console.log(`  Environment:  ${process.env.NODE_ENV || 'production'} (Profile: ${process.env.SPRING_PROFILES_ACTIVE || 'prod'})`);
    console.log('====================================================');
    await ensureBackendRunning();
  });
}

module.exports = {
  normalizeDatabaseUrl,
  resolveDatabaseConfig,
  server
};
