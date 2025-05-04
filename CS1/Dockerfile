# Use an official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all app files
COPY . .

# Expose the app port
EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
