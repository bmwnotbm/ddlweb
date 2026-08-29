FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3000

# ใช้โหมด dev เพื่อความง่ายในการพัฒนา; งาน production ควรใช้ next build + next start
CMD ["npm", "run", "dev"]
