FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY . .

# Create reports directory
RUN mkdir -p /app/reports

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
