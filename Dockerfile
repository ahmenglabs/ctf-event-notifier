FROM archlinux:latest

RUN pacman -Syu --noconfirm && \
    pacman -S --noconfirm \
    base-devel \
    curl \
    wget \
    git \
    ffmpeg \
    python \
    ca-certificates \
    chromium \
    nss \
    nspr \
    atk \
    at-spi2-core \
    cups \
    libdrm \
    gtk3 \
    pango \
    cairo \
    libx11 \
    libxcomposite \
    libxdamage \
    libxext \
    libxfixes \
    libxi \
    libxrandr \
    libxrender \
    libxss \
    libxtst \
    alsa-lib \
    xdg-utils \
    mesa \
    dbus \
    expat \
    fontconfig \
    freetype2 \
    gcc-libs \
    glib2 \
    glibc \
    libxcb \
    libxcursor

RUN pacman -S --noconfirm nodejs npm

RUN pacman -Scc --noconfirm

RUN mkdir -p /app/.wwebjs_auth /app/.wwebjs_cache

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

VOLUME ["/app/.wwebjs_auth", "/app/.wwebjs_cache"]

CMD ["npm", "start"]
