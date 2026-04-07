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

# Railway tự gán PORT, không hardcode EXPOSE
# EXPOSE sẽ do Railway tự quản lý

# Khởi động: migrate database rồi chạy server
CMD ["sh", "-c", "node server/config/migrate.js && node server/index.js"]
