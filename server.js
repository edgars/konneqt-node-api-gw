const fastify = require('fastify')({ logger: true });
const fs = require('fs');
const path = require('path');
const helmet = require('@fastify/helmet');
const httpProxy = require('@fastify/http-proxy');
const rateLimit = require('@fastify/rate-limit');
const cors = require('@fastify/cors'); // Plugin de CORS

// Middleware de segurança com Helmet
fastify.register(helmet);

// Função para carregar interceptadores
async function loadInterceptors(interceptors, fastify, req, reply) {
  return Promise.all(
    interceptors.map(async (interceptorPath) => {
      try {
        const interceptor = require(path.join(__dirname, interceptorPath));
        await interceptor(fastify, req, reply);
      } catch (err) {
        fastify.log.error(`Erro ao executar interceptador ${interceptorPath}: ${err.message}`);
        throw err;
      }
    })
  );
}

// Função para carregar rotas e configurações do routes.json
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

    // Configuração de Rotas Individuais
    for (const route of config.routes) {
      // Configuração de Rate Limit
      if (route.rateLimit) {
        fastify.register(rateLimit, {
          max: route.rateLimit.max,
          timeWindow: route.rateLimit.timeWindow,
          keyGenerator: (req) => req.ip,
          onExceeding: (req) =>
            fastify.log.warn(`Usuário ${req.ip} próximo do limite na rota ${route.url}`),
          onExceeded: (req) =>
            fastify.log.warn(`Usuário ${req.ip} excedeu o limite na rota ${route.url}`),
        });
      }

      if (route.proxy && route.proxy.target) {
        // Registrar rotas de proxy diretamente com @fastify/http-proxy
        fastify.register(httpProxy, {
          upstream: route.proxy.target,
          prefix: route.url, // Define o prefixo para a rota
          rewritePrefix: '', // Remove o prefixo original da URL ao encaminhar a requisição
          http2: false, // Usa HTTP/1.1 por padrão
        });

        fastify.log.info(`Proxy configurado: ${route.method} ${route.url} -> ${route.proxy.target}`);
      } else {
        // Rotas não-proxy (executar interceptadores e lógica personalizada)
        fastify.route({
          method: route.method,
          url: route.url,
          preHandler: async (req, reply) => {
            // Executa interceptadores antes da rota (preInterceptors)
            if (route.preInterceptors && route.preInterceptors.length > 0) {
              await loadInterceptors(route.preInterceptors, fastify, req, reply);
            }
          },
          handler: async (req, reply) => {
            // Handler de rotas não-proxy
            reply.send({ message: `Rota ${route.url} executada com sucesso` });
          },
          onResponse: async (req, reply) => {
            // Executa interceptadores após a rota (postInterceptors)
            if (route.postInterceptors && route.postInterceptors.length > 0) {
              await loadInterceptors(route.postInterceptors, fastify, req, reply);
            }
          },
        });

        fastify.log.info(`Rota configurada: ${route.method} ${route.url} -> Handler local`);
      }
    }
  } catch (err) {
    fastify.log.error(`Erro ao carregar rotas: ${err.message}`);
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
    fastify.log.info(`Servidor rodando em http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
