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

# Railway thông thường cho phép tự định nghĩa ENV PORT và EXPOSE
ENV PORT=3000

# Khai báo cổng để Railway Router nhận diện chính xác
EXPOSE 3000

# Khởi động: server/index.js đã tự động gọi hàm migrate
CMD ["node", "server/index.js"]
