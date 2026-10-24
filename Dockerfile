# ==============================================================================
# ShopFlow - Backend Production Multi-Stage Dockerfile (TASK-26.3)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compile TypeScript
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Sao chép file cấu hình dependencies
COPY package*.json tsconfig.json ./

# Cài đặt toàn bộ dependencies bao gồm cả devDependencies để biên dịch TypeScript
RUN npm ci

# Sao chép toàn bộ mã nguồn
COPY src/ ./src

# Biên dịch mã nguồn TypeScript sang JavaScript thuần trong thư mục dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runner (Tối ưu dung lượng < 150MB & Bảo mật non-root)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Cài đặt dumb-init để xử lý signals PID 1 an toàn (Graceful Shutdown)
RUN apk add --no-cache dumb-init

# Chỉ cài đặt production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Sao chép bản build dist từ Stage 1
COPY --from=builder /app/dist ./dist

# Đổi quyền sở hữu cho user không đặc quyền 'node'
RUN chown -R node:node /app

# Chạy với quyền người dùng thông thường để tuân thủ tiêu chuẩn an toàn OWASP
USER node

EXPOSE 5000

# Health check định kỳ
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Sử dụng dumb-init để điều phối tín hiệu SIGTERM / SIGINT
CMD ["dumb-init", "node", "dist/index.js"]
