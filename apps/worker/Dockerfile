FROM node:20

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy only package.json and lock first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set proper permissions (optional)
RUN chown -R node:node /app

# Use a non-root user (optional but recommended)
USER node

# Use tsx watch for hot reload
CMD ["npm", "run", "dev"]