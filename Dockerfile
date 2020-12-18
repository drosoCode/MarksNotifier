#FROM debian:buster
FROM node:14-buster-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    LC_ALL=C.UTF-8 \
    DISPLAY=:99

# Install supervisor, noVNC, X11 packages and chromium
RUN apt-get update && \
    apt-get install -y \
    --no-install-recommends \
    net-tools \
    socat \
    novnc \
    supervisor \
    x11vnc \
    xvfb \
    chromium && \
    ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

COPY supervisord.conf /etc/supervisord.conf

WORKDIR /home

ADD package.json package.json
RUN npm install
ADD main.js main.js

CMD ["supervisord", "-c", "/etc/supervisord.conf"]