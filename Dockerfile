FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r -g 1501 siteuser && useradd -r -g siteuser -u 1501 siteuser

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN chown -R siteuser:siteuser /app \
    && mkdir -p /app/uploads /app/tmp /app/data /app/logs \
    && chown siteuser:siteuser /app/uploads /app/tmp /app/data /app/logs \
    && chmod 750 /app/uploads /app/tmp /app/data /app/logs

USER siteuser

ENV NODE_ENV=production
ENV PORT=5005

EXPOSE 5005

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5005/health || exit 1

CMD ["node", "server.js"]
