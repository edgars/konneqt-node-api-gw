module.exports = async (fastify, req, reply) => {
    fastify.log.info(`🎉🎉🎉🎉🎉🎉🎉 [POST] Resposta enviada: ${req.method} ${req.url}, Status: ${reply.statusCode}`);
  };
  