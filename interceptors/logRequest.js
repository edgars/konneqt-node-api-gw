module.exports = async (request, reply) => {
  console.log(`[Request] ${request.method} ${request.url}`, {
    headers: request.headers,
    body: request.body,
  });
};
