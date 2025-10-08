FROM node:22-alpine

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    ffmpeg \
    python3 \
    make \
    g++ \
    pkgconfig \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    pixman-dev

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

VOLUME ["/app/.wwebjs_auth", "/app/.wwebjs_cache"]

CMD ["npm", "start"]