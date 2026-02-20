const jwt = require('jsonwebtoken')
const { Users, Roles } = require('../models/models')

module.exports = function (req, res, next) {
    if (req.method === 'OPTIONS') {
        next()
    }
    try {
        const token = req.headers.authorization?.split(' ')[1] // Bearer TOKEN
        if (!token) {
            return res.status(401).json({ message: 'Не авторизован' })
        }
        const decoded = jwt.verify(token, process.env.SECRET_KEY || 'your-secret-key')
        req.user = decoded
        next()
    } catch (e) {
        res.status(401).json({ message: 'Не авторизован' })
    }
}

// Middleware для проверки роли
module.exports.checkRole = (...roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ message: 'Не авторизован' })
            }

            const user = await Users.findOne({
                where: { id: req.user.id },
                include: [{ model: Roles }]
            })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            // Проверяем, не удален ли пользователь
            if (user.is_deleted) {
                return res.status(403).json({ message: 'Пользователь удален' })
            }

            if (user.IsBlocked) {
                return res.status(403).json({ message: 'Пользователь заблокирован' })
            }

            // Sequelize может вернуть роль в разных форматах
            const roleName = user.role?.RoleName || user.Role?.RoleName || user.Roles?.RoleName
            
            if (!roleName) {
                return res.status(500).json({ message: 'Роль пользователя не найдена' })
            }

            // Проверяем, есть ли роль пользователя в списке разрешенных
            if (!roles.includes(roleName)) {
                return res.status(403).json({ message: 'Нет доступа' })
            }

            req.userRole = roleName
            req.userLogin = user.Login
            next()
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

