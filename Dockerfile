# BVote Mini Game - Dockerfile
FROM node:20-alpine

# Thư mục làm việc
WORKDIR /app

# Copy package files
COPY package*.json ./

# Cài đặt dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Biến môi trường mặc định
ENV NODE_ENV=production

# Cố định cổng 3000 -> 8080 (Chuẩn mặc định của Railway/Docker)
ENV PORT=8080
EXPOSE 8080

# Khởi động: server/index.js đã tự động gọi hàm migrate
CMD ["node", "server/index.js"]
