FROM node:20

WORKDIR /src

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile TypeScript to JavaScript
RUN npm run build

# Verify the dist folder exists
RUN ls -al /src/dist

# Expose ports
EXPOSE 3002
EXPOSE 80

# Start the application
CMD ["node", "dist/index.js"]
