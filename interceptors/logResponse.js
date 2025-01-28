module.exports = async (request, reply) => {
  console.log(`🟢 [Response] ${reply.statusCode}`, {
    headers: reply.getHeaders(),
    body: reply.body,
  });
};
