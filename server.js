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

// Inicializa o servidor
async function startServer() {
  try {
    // Carrega rotas do arquivo JSON
    await loadRoutes();

    // Inicia o servidor
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    fastify.log.info(`Servidor rodando em http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
