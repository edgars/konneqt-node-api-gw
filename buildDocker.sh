docker build -t konneqt-micro-gateway .    

docker run -d -p 3000:3000 -v $(pwd)/server.js:/app/server.js fastify-app