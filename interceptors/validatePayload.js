module.exports = async (fastify, req, reply) => {
    if (!req.body || !req.body.title) {
      reply.status(400).send({ error: 'O campo "title" é obrigatório.' });
      throw new Error('☑️ Validação de payload falhou.');
    }
    fastify.log.info('☑️ Payload validado com sucesso.');
  };