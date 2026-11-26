# Multi-stage production container for ContentGrid
# Built by SPManchester Private Limited (https://spmanchester.com)
FROM node:22-alpine

WORKDIR /app

# Create unprivileged system user
RUN addgroup -S spm && adduser -S spm -G spm

# Copy application files
COPY --chown=spm:spm package.json ./
COPY --chown=spm:spm backend/ ./backend/
COPY --chown=spm:spm database/ ./database/
COPY --chown=spm:spm web/ ./web/

# Setup persistent data folder
RUN mkdir -p /app/backend/data && chown -R spm:spm /app/backend/data

USER spm

ENV NODE_ENV=production \
    PORT=4000 \
    HOST=0.0.0.0 \
    DB_PATH=/app/backend/data/contentgrid.sqlite

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:4000/health || exit 1

CMD ["node", "backend/src/server.js"]
