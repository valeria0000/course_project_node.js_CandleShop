require('dotenv').config()
const express = require('express')
const path = require('path')
const sequelize = require('./db')
const models = require('./models/models.js')
const cors = require('cors')

const PORT = process.env.PORT || 5000

const app = express()

    // Настройка CORS для работы с фронтендом
    app.use(cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        credentials: true
    }))
    app.use(express.json())
    
    // Статические файлы для изображений
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Подключение роутов
const authRouter = require('./routes/authRouter')
const itemRouter = require('./routes/itemRouter')
const categoryRouter = require('./routes/categoryRouter')
const cartRouter = require('./routes/cartRouter')
const orderRouter = require('./routes/orderRouter')
const userRouter = require('./routes/userRouter')
const favouriteRouter = require('./routes/favouriteRouter')

app.use('/api/auth', authRouter)
app.use('/api/items', itemRouter)
app.use('/api/categories', categoryRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', orderRouter)
app.use('/api/users', userRouter)
app.use('/api/favourites', favouriteRouter)

app.get('/', (req, res) => {
    res.status(200).json({message: 'WORKING!!'})
})

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack)
    if (err.code === 'LIMIT_FILE_SIZE') {
        // Проверяем, является ли это запросом на обновление профиля
        const isProfileUpdate = req.path && req.path.includes('/profile');
        const maxSize = isProfileUpdate ? '20MB' : '5MB';
        return res.status(400).json({ message: `Файл слишком большой. Максимальный размер: ${maxSize}` })
    }
    if (err.message === 'Разрешены только изображения!') {
        return res.status(400).json({ message: err.message })
    }
    res.status(500).json({ message: 'Что-то пошло не так!' })
})

const seed = require('./seed')

const start = async () => {
    try {
        await sequelize.authenticate()
        console.log('База данных подключена успешно')
        await sequelize.sync()
        console.log('Модели синхронизированы')
        
        // Запускаем seed для создания дефолтного админа
        await seed()
        
        app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`))
    } catch (e) {
        console.log('Ошибка при запуске сервера:', e)
    }
}

start()

