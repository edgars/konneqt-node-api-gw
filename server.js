const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const helmet = require('@fastify/helmet');
const httpProxy = require('@fastify/http-proxy');
const rateLimit = require('@fastify/rate-limit');
const cors = require('@fastify/cors'); // Plugin de CORS

// Middleware de segurança com Helmet
fastify.register(helmet);

// Function to load and execute interceptors
async function loadInterceptors(interceptors, fastify, req, reply) {
  for (const interceptorPath of interceptors) {
    try {
      // Dynamically load the interceptor file
      const interceptor = require(path.join(__dirname, interceptorPath));
      fastify.log.info(`Executing interceptor: ${interceptorPath}`);
      // Execute the interceptor as a function
      await interceptor(fastify, req, reply);
    } catch (err) {
      fastify.log.error(`Error executing interceptor ${interceptorPath}: ${err.message}`);
      throw err; // Stop processing if an interceptor fails
    }
  }
}

// Function to load routes from routes.json and configure them
async function loadRoutes() {
  try {
    const routesPath = path.join(__dirname, 'routes.json');
    const config = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

    // Configure global CORS
    if (config.cors && config.cors.enabled) {
      fastify.register(cors, {
        origin: config.cors.origin || '*',
        methods: config.cors.methods || ['GET', 'POST', 'PUT', 'DELETE'],
      });
      fastify.log.info('Global CORS enabled');
    }

    // Configure individual routes
    for (const route of config.routes) {
      // Configure rate limiting
      if (route.rateLimit) {
        fastify.register(rateLimit, {
          max: route.rateLimit.max,
          timeWindow: route.rateLimit.timeWindow,
          keyGenerator: (req) => req.ip,
          onExceeding: (req) =>
            fastify.log.warn(`User ${req.ip} nearing rate limit for route ${route.url}`),
          onExceeded: (req) =>
            fastify.log.warn(`User ${req.ip} exceeded rate limit for route ${route.url}`),
        });
      }

      if (route.proxy && route.proxy.target) {
        // Register proxy routes with @fastify/http-proxy
        fastify.register(httpProxy, {
          upstream: route.proxy.target,
          prefix: route.url,
          rewritePrefix: '', // Remove prefix when forwarding to the target
          http2: false,
        });
        fastify.log.info(`Proxy configured: ${route.method} ${route.url} -> ${route.proxy.target}`);
      } else {
        // Configure non-proxy routes
        fastify.route({
          method: route.method,
          url: route.url,
          preHandler: async (req, reply) => {
            // Execute pre-interceptors
            if (route.preInterceptors && route.preInterceptors.length > 0) {
              await loadInterceptors(route.preInterceptors, fastify, req, reply);
            }
          },
          handler: async (req, reply) => {
            // Handle non-proxy routes
            reply.send({ message: `Route ${route.url} executed successfully` });
          },
          onResponse: async (req, reply) => {
            // Execute post-interceptors
            if (route.postInterceptors && route.postInterceptors.length > 0) {
              await loadInterceptors(route.postInterceptors, fastify, req, reply);
            }
          },
        });

        fastify.log.info(`Route configured: ${route.method} ${route.url}`);
      }
    }
  } catch (err) {
    fastify.log.error(`Error loading routes: ${err.message}`);
    process.exit(1);
  }
}



const asciiArt = fs.readFileSync(path.join(__dirname, 'logo.txt'), 'utf8');
// Inicializa o servidor
async function startServer() {
  try {
    // Carrega rotas do arquivo JSON
    await loadRoutes();

    // Inicia o servidor
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(asciiArt)
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
