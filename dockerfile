# --- Stage 1: Build Frontend (Vite) ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
# ✅ Copy package.json จากโฟลเดอร์ frontend [cite: 5]
COPY ./frontend/package*.json ./
RUN npm install --frozen-lockfile
# ✅ Copy โค้ดทั้งหมดของ frontend และสั่ง build [cite: 6]
COPY ./frontend .
RUN npm run build

# --- Stage 2: Final Runtime (Backend + Static Frontend) ---
FROM node:20-slim
WORKDIR /app

# ✅ ติดตั้ง Python และ Tesseract OCR สำหรับงาน OCR ของคุณ 
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-tha \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ✅ ติดตั้ง Node Dependencies ของ Backend
COPY ./backend/package*.json ./
RUN npm install --production

# ✅ ติดตั้ง Python Requirements สำหรับ ocr_processor.py 
COPY ./backend/requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# ✅ Copy ไฟล์ที่ Build เสร็จจาก Stage 1 มาไว้ในโฟลเดอร์ public ของ Backend 
COPY --from=frontend-builder /app/frontend/dist ./public

# ✅ Copy โค้ด Backend ทั้งหมดมาวาง 
COPY ./backend .
RUN mkdir -p /app/processed_uploads

EXPOSE 8080
CMD ["node", "server.js"]