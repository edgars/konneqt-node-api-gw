module.exports = async (request, reply) => {
    const token = request.headers.authorization;
  
    if (!token) {
      reply.code(401).send({ error: 'Unauthorized' });
      throw new Error('Unauthorized');
    }
  
    // Perform token validation (mock example)
    const isValidToken = token === 'Bearer valid-token';
    if (!isValidToken) {
      reply.code(403).send({ error: 'Forbidden' });
      throw new Error('Forbidden');
    }
  
    // Attach user info to the request
    request.user = { id: 123, name: 'John Doe' };
  };
  