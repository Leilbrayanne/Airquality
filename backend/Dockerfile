FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5002
EXPOSE 1886

# Run as non-root user for security
USER node

CMD ["npm", "start"]
