# Use the official Node.js runtime as base image
# Using Alpine version for smaller image size
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
# This is done before copying other files for better caching
COPY package*.json ./

# Install dependencies
# Using 'npm ci' instead of 'npm install' for production builds
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
# Cloud Run expects apps to listen on port 8080
EXPOSE 8080

# Define the command to run your application
CMD ["npm", "start"]