FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы
COPY . .

# Создаем директорию для uploads
RUN mkdir -p uploads/images

# Открываем порт
EXPOSE 5000

# Команда запуска
CMD ["node", "index.js"]

