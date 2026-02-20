const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Создаем папку для загрузки изображений, если её нет
const uploadDir = path.join(__dirname, '../uploads/images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        // Используем разные префиксы для товаров и профилей
        const prefix = file.fieldname === 'Photo' ? 'profile-' : 'item-';
        cb(null, prefix + uniqueSuffix + ext);
    }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
    // Разрешаем только изображения
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Разрешены только изображения!'), false);
    }
};

// Базовый upload для товаров (5MB)
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Upload для профилей с увеличенным лимитом (20MB)
const uploadProfile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB для профильных фото
    }
});

module.exports = { upload, uploadProfile };





