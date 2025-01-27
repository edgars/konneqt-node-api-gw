module.exports = async (fastify, req, reply) => {
    fastify.log.info(`🟢🟢🟢🟢 ➡️➡️➡️➡️➡️➡️➡️[PRE] Requisição recebida: ${req.method} ${req.url}`);
  };
  