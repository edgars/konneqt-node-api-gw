const fs = require('fs');
const path = require('path');
const asciiArt = fs.readFileSync(path.join(__dirname, 'logo.txt'), 'utf8');

const fastify = require('fastify')({ logger: true });
const rateLimit = require('@fastify/rate-limit');
const httpProxy = require('@fastify/http-proxy');
const cors = require('@fastify/cors');

// Register the @fastify/static plugin to serve static files
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'), // Serve files from the "public" folder
  prefix: '/ui', // Mount the UI on the "/ui" path
});

// Serve the CRUD UI on "/ui"
fastify.get('/ui', async (request, reply) => {
  return reply.sendFile('index.html'); // Serve the HTML file
});

// Utility to dynamically load interceptors
function loadInterceptor(interceptorPath) {
  try {
    const interceptor = require(interceptorPath);
    if (typeof interceptor !== 'function') {
      throw new Error(`Interceptor at ${interceptorPath} is not a valid function.`);
    }
    return interceptor;
  } catch (error) {
    fastify.log.error(`Failed to load interceptor: ${error.message}`);
    return null;
  }
}

// Load routes.json configuration
async function loadRoutesConfig() {
  const routesPath = path.join(__dirname, 'routes.json');
  try {
    const data = await fs.promises.readFile(routesPath, 'utf-8');
    const routes = JSON.parse(data);
    return routes;
  } catch (error) {
    fastify.log.error(`Failed to load routes.json: ${error.message}`);
    process.exit(1); // Exit if routes.json is missing or invalid
  }
}

// Register routes dynamically with proxy support, preInterceptors, and postInterceptors
async function registerRoutes() {
  const routes = await loadRoutesConfig();

  // Check if `routes` is an array
  if (!Array.isArray(routes)) {
    throw new Error('Invalid routes.json format: Expected an array of routes.');
  }

  routes.forEach((route) => {
    const {
      method,
      url,
      proxy,
      preInterceptors = [],
      postInterceptors = [],
      rateLimit: customRateLimit,
    } = route;

    if (!proxy || !proxy.target) {
      fastify.log.error(`Route ${url} is missing a valid proxy target.`);
      return;
    }

    // Load preInterceptors
    const preInterceptorFunctions = preInterceptors.map((interceptorPath) => {
      const interceptorFullPath = path.join(__dirname, interceptorPath);
      return loadInterceptor(interceptorFullPath);
    }).filter(Boolean); // Filter out invalid interceptors

    // Load postInterceptors
    const postInterceptorFunctions = postInterceptors.map((interceptorPath) => {
      const interceptorFullPath = path.join(__dirname, interceptorPath);
      return loadInterceptor(interceptorFullPath);
    }).filter(Boolean); // Filter out invalid interceptors

    // Register a proxy route with pre and post interceptors
    fastify.register(httpProxy, {
      upstream: proxy.target, // The upstream service
      prefix: url, // The exposed path
      http2: false, // Disable HTTP/2
      replyOptions: {
        onResponse: async (request, reply, resStream) => {
          // Execute postInterceptors after the proxy response
          reply.header('x-powered-by', 'Konneqt Micro API Gateway - Version Beta 0.1');
          for (const interceptor of postInterceptorFunctions) {
            await interceptor(request, reply);
          }

          reply.send(resStream); // Send the proxied response back
        },
      },
    });

    // Apply preInterceptors via an onRequest hook
    fastify.addHook('onRequest', async (request, reply) => {
      if (request.url.startsWith(url)) {
        for (const interceptor of preInterceptorFunctions) {
          await interceptor(request, reply); // Execute each pre-interceptor
        }
      }
    });


    const rateLimiters = {}; // Per-route in-memory storage for rate limits

async function rateLimiter(request, reply, maxRequestsConfig, timeWindow) {
  const clientIp = request.ip;
  const routeKey = `${request.routerPath}-${clientIp}`; // Combine route and IP for uniqueness
  const now = Date.now();

  // Initialize rate limiter data for this route and IP
  if (!rateLimiters[routeKey]) {
    rateLimiters[routeKey] = {
      count: 0,
      startTime: now,
    };
  }

  const rateLimiterData = rateLimiters[routeKey];
  const timeWindowMs = timeWindow
  const maxRequests = maxRequestsConfig

  // Reset the counter if the time window has expired
  if (now - rateLimiterData.startTime > timeWindowMs) {
    rateLimiterData.startTime = now;
    rateLimiterData.count = 0;
  }

  // Increment the request count
  rateLimiterData.count++;
  

  if (rateLimiterData.count == maxRequests-1){
    reply.header('x-ratelimit-executed-requests', "you are about to get blocked by rate limit");
  } else {
    reply.header('x-ratelimit-executed-requests', rateLimiterData.count);
  }

  // Check if the request limit has been exceeded
  if (rateLimiterData.count > maxRequests) {
    reply.status(429).send({ error: 'Too many requests. Please try again later.' });
    return false;
  }

  // Allow the request to proceed
  return true;
}

    // Apply rate limiting per route (if defined)
    if (customRateLimit) {
      fastify.addHook('onRequest', async (request, reply) => {
        if (request.url.startsWith(url)) {
          // add as constantes do rate limit do routes.json
          const isRateLimited = await rateLimiter(request, reply, customRateLimit.max, customRateLimit.timeWindow);
          if (!isRateLimited) {
            return;
          }
        }
      });
    }

    fastify.log.info(`Registered route ${method.toUpperCase()} ${url} -> ${proxy.target}`);
  });
}

// Register global plugins
async function setupCors() {
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
}

// Para Rate Limiting Global, quando o limite de requisições é atingido, o servidor responde com o status 429 (Too Many Requests) e o cabeçalho Retry-After com o tempo em segundos que o cliente deve esperar antes de fazer uma nova requisição.
async function setupRateLimit() {
  await fastify.register(rateLimit, {
    global: true,
    max: 20, // Default max requests
    timeWindow: '1 minute', // Default time window
    keyGenerator: (request) => request.headers['x-real-ip'] || request.ip,
  });
}

// Main server initialization
async function startServer() {
  try {
    console.log(asciiArt)
    await setupCors();
    //await setupRateLimit();
    await registerRoutes();

    const PORT = process.env.PORT || 3000;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
  } catch (error) {
    fastify.log.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
}

// Start the server
startServer();