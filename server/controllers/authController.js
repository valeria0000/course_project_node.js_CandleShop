const { Users, Roles } = require('../models/models')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const generateJwt = (id, login, roleId) => {
    return jwt.sign(
        { id, login, roleId },
        process.env.SECRET_KEY || 'your-secret-key',
        { expiresIn: '24h' }
    )
}

class AuthController {
    async registration(req, res) {
        try {
            const { login, password, email, name } = req.body

            if (!login || !password) {
                return res.status(400).json({ message: 'Логин и пароль обязательны' })
            }

            // Валидация логина
            if (login.trim().length < 3) {
                return res.status(400).json({ message: 'Логин должен содержать минимум 3 символа' })
            }
            if (login.trim().length > 30) {
                return res.status(400).json({ message: 'Логин не должен превышать 30 символов' })
            }
            if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(login)) {
                return res.status(400).json({ message: 'Логин может содержать только буквы, цифры и символ _' })
            }

            // Валидация пароля
            if (password.length < 6) {
                return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' })
            }
            if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) {
                return res.status(400).json({ message: 'Пароль должен содержать хотя бы одну букву' })
            }

            // Проверяем, существует ли пользователь (исключаем удаленных)
            const candidate = await Users.findOne({ 
                where: { 
                    Login: login,
                    is_deleted: false
                } 
            })
            if (candidate) {
                return res.status(400).json({ message: 'Пользователь с таким логином уже существует' })
            }

            // Проверяем email, если указан (исключаем удаленных)
            if (email) {
                const emailCandidate = await Users.findOne({ 
                    where: { 
                        Email: email,
                        is_deleted: false
                    } 
                })
                if (emailCandidate) {
                    return res.status(400).json({ message: 'Пользователь с таким email уже существует' })
                }
            }

            // Хешируем пароль
            const hashPassword = await bcrypt.hash(password, 5)

            // Находим роль "Пользователь" (предполагаем, что id=3 или создаем по имени)
            let userRole = await Roles.findOne({ where: { RoleName: 'Пользователь' } })
            if (!userRole) {
                // Если роли нет, создаем её или используем id=3
                userRole = await Roles.findOne({ where: { id: 3 } })
                if (!userRole) {
                    // Создаем роль, если её нет
                    userRole = await Roles.create({ RoleName: 'Пользователь' })
                }
            }

            // Создаем пользователя
            const user = await Users.create({
                Login: login,
                Password: hashPassword,
                Email: email || null,
                Name: name || null,
                RoleId: userRole.id,
                IsBlocked: false
            })

            // Получаем пользователя с ролью для токена
            const userWithRole = await Users.findOne({
                where: { id: user.id },
                include: [{ model: Roles }]
            })

            const token = generateJwt(user.id, user.Login, user.RoleId)

            return res.json({ token, user: userWithRole })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async login(req, res) {
        try {
            const { login, password } = req.body

            if (!login || !password) {
                return res.status(400).json({ message: 'Логин и пароль обязательны' })
            }

            const user = await Users.findOne({
                where: { Login: login },
                include: [{ model: Roles }]
            })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            // Проверяем, не удален ли пользователь
            if (user.is_deleted) {
                return res.status(403).json({ message: 'Пользователь удален' })
            }

            // Проверяем, не заблокирован ли пользователь
            if (user.IsBlocked) {
                return res.status(403).json({ message: 'Пользователь заблокирован' })
            }

            // Проверяем пароль
            let comparePassword = bcrypt.compareSync(password, user.Password)
            if (!comparePassword) {
                return res.status(400).json({ message: 'Неверный пароль' })
            }

            const token = generateJwt(user.id, user.Login, user.RoleId)

            return res.json({ token, user })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async check(req, res) {
        try {
            // req.user устанавливается в middleware authMiddleware
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

            const token = generateJwt(user.id, user.Login, user.RoleId)
            return res.json({ token, user })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new AuthController()

