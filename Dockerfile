# Base image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "run", "start"]
