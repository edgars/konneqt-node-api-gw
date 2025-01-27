const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const helmet = require('@fastify/helmet');
const httpProxy = require('@fastify/http-proxy');
const rateLimit = require('@fastify/rate-limit');
const cors = require('@fastify/cors'); // Plugin de CORS



// Middleware de segurança com Helmet
fastify.register(helmet);

// Função para carregar rotas, Rate Limit, Proxy e CORS
async function loadRoutes() {
  try {
    const routesPath = path.join(__dirname, 'routes.json');
    const config = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

    // Configuração Global de CORS
    if (config.cors && config.cors.enabled) {
      fastify.register(cors, {
        origin: config.cors.origin || '*',
        methods: config.cors.methods || ['GET', 'POST', 'PUT', 'DELETE'],
      });
      fastify.log.info('CORS global habilitado');
    }

    // Carregar rotas individuais
    for (const route of config.routes) {
      // Configuração de CORS por rota, se sobrescrito
      if (route.cors === true) {
        fastify.register(cors, {
          origin: config.cors.origin || '*',
          methods: [route.method],
        });
        fastify.log.info(`CORS habilitado para a rota ${route.url}`);
      } else if (route.cors === false) {
        fastify.log.info(`CORS desabilitado para a rota ${route.url}`);
      }

      // Configuração de Rate Limit por rota
      if (route.rateLimit) {
        fastify.register(rateLimit, {
          max: route.rateLimit.max,
          timeWindow: route.rateLimit.timeWindow,
          keyGenerator: (req) => req.ip,
          onExceeding: (req) => fastify.log.warn(`Usuário ${req.ip} próximo do limite na rota ${route.url}`),
          onExceeded: (req) => fastify.log.warn(`Usuário ${req.ip} excedeu o limite na rota ${route.url}`),
        });
      }

      // Configura proxy para a API externa
      if (route.proxy && route.proxy.target) {
        fastify.register(httpProxy, {
          upstream: route.proxy.target,
          prefix: route.url,
          http2: false,
        });
        fastify.log.info(`Proxy configurado: ${route.url} -> ${route.proxy.target}`);
      } else {
        fastify.log.warn(`Rota ignorada (sem proxy.target): ${route.url}`);
      }
    }
  } catch (err) {
    fastify.log.error(`Erro ao carregar rotas: ${err.message}`);
    process.exit(1);
  }
}

// Function to load routes and generate Postman collection
async function loadRoutesAndGeneratePostman() {
  try {
    // Load routes.json
    const routesPath = path.join(__dirname, 'routes.json');
    const config = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

    // Initialize Postman collection structure
    const postmanCollection = {
      info: {
        name: 'API Gateway Postman Collection',
        description: 'Collection of API routes from routes.json',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
    };

    for (const route of config.routes) {
      // Add route to Fastify
      fastify.route({
        method: route.method,
        url: route.url,
        handler: async (req, reply) => {
          reply.send({ message: `This is a proxy route for ${route.proxy.target}` });
        },
      });

      // Add route to Postman collection
      const urlParts = route.url.split('/').filter((part) => part); // Remove empty segments
      postmanCollection.item.push({
        name: `Route: ${route.url}`,
        request: {
          method: route.method,
          header: [],
          url: {
            raw: `http://localhost:3000${route.url}`,
            protocol: 'http',
            host: ['localhost:3000'],
            path: urlParts,
          },
        },
      });

      fastify.log.info(`Route configured: ${route.method} ${route.url} -> ${route.proxy.target}`);
    }

    // Write the Postman collection to a file
    const postmanFilePath = path.join(__dirname, 'postman_collection.json');
    fs.writeFileSync(postmanFilePath, JSON.stringify(postmanCollection, null, 2));
    fastify.log.info(`Postman collection saved to ${postmanFilePath}`);

    // Expose the Postman collection via an API endpoint
    fastify.get('/postman-collection', async (req, reply) => {
      const collectionContent = fs.readFileSync(postmanFilePath, 'utf8');
      reply
        .header('Content-Type', 'application/json')
        .send(JSON.parse(collectionContent));
    });
  } catch (err) {
    fastify.log.error(`Error loading routes: ${err.message}`);
    process.exit(1);
  }
}

// Inicializa o servidor
async function startServer() {
  const asciiArt = fs.readFileSync(path.join(__dirname, 'logo.txt'), 'utf8');
  try {
    // Carrega rotas do arquivo JSON
    await loadRoutes();
    // Inicia o servidor
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(asciiArt);
    fastify.log.info(`Servidor rodando em http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
