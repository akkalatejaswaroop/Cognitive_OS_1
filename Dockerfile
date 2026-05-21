# Frontend build stage
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
# Set build-time env vars if needed
ENV NEXT_PUBLIC_API_ENDPOINT=http://localhost:8000
RUN npm run build

# Backend and Final stage
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules

# Copy root files (like .env if needed, but usually env vars are passed)
COPY .env.example .env

# Expose ports
EXPOSE 3000 8000

# Script to start both backend and frontend
RUN echo '#!/bin/bash\n\
cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &\n\
cd /app/frontend && npm run start -- -p 3000\n\
wait' > /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
