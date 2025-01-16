# Use Node.js image
FROM node:16

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]