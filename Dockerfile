# Use the official Node.js LTS (long-term support) image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that Fastify listens on (3000 in this case)
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]