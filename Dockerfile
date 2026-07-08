FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY fetch-media.js .
# Ensure the data directory exists
RUN mkdir -p docs/data/posters
CMD ["node", "fetch-media.js"]
