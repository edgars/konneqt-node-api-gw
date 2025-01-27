const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const helmet = require('@fastify/helmet');
const httpProxy = require('@fastify/http-proxy');
const rateLimit = require('@fastify/rate-limit');

// Middleware de segurança com Helmet
fastify.register(helmet);

// Função para carregar rotas e aplicar Rate Limit e Proxy
async function loadRoutes() {
  try {
    const routesPath = path.join(__dirname, 'routes.json');
    const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));

    for (const route of routes) {
      if (route.proxy && route.proxy.target) {
        // Configura rate limit para a rota, se definido
        if (route.rateLimit) {
          fastify.register(rateLimit, {
            max: route.rateLimit.max,
            timeWindow: route.rateLimit.timeWindow,
            keyGenerator: (req) => req.ip, // Usa o IP do cliente para o rate limit
            onExceeding: (req) => fastify.log.warn(`Usuário ${req.ip} próximo do limite na rota ${route.url}`),
            onExceeded: (req) => fastify.log.warn(`Usuário ${req.ip} excedeu o limite na rota ${route.url}`),
          });
        }

        // Registra a rota como proxy para APIs externas
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
