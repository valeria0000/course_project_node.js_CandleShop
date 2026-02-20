const { Users, Roles } = require('../models/models')
const bcrypt = require('bcrypt')
const path = require('path')
const fs = require('fs')

class UserController {
    // Получить всех пользователей (только для админа)
    async getAll(req, res) {
        try {
            const users = await Users.findAll({
                where: { is_deleted: false }, // Исключаем удаленных пользователей
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] } // Не возвращаем пароли
            })
            return res.json(users)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Получить пользователя по ID
    async getOne(req, res) {
        try {
            const { id } = req.params
            const user = await Users.findOne({
                where: { id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            return res.json(user)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Блокировать пользователя
    async block(req, res) {
        try {
            const { id } = req.params
            const user = await Users.findOne({ where: { id } })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            await Users.update({ IsBlocked: true }, { where: { id } })
            const updatedUser = await Users.findOne({
                where: { id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            return res.json(updatedUser)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Разблокировать пользователя
    async unblock(req, res) {
        try {
            const { id } = req.params
            const user = await Users.findOne({ where: { id } })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            await Users.update({ IsBlocked: false }, { where: { id } })
            const updatedUser = await Users.findOne({
                where: { id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            return res.json(updatedUser)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Удалить пользователя (логическое удаление)
    async delete(req, res) {
        try {
            const { id } = req.params
            const user = await Users.findOne({ where: { id } })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            // Не позволяем удалить самого себя
            if (user.id === req.user.id) {
                return res.status(400).json({ message: 'Нельзя удалить самого себя' })
            }

            // Логическое удаление
            await Users.update({ is_deleted: true }, { where: { id } })
            const updatedUser = await Users.findOne({
                where: { id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })
            return res.json({ message: 'Пользователь удален', user: updatedUser })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Создать менеджера (только для админа)
    async createManager(req, res) {
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

            const candidate = await Users.findOne({ 
                where: { 
                    Login: login,
                    is_deleted: false
                } 
            })
            if (candidate) {
                return res.status(400).json({ message: 'Пользователь с таким логином уже существует' })
            }

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

            const hashPassword = await bcrypt.hash(password, 5)

            // Находим роль "Менеджер"
            let managerRole = await Roles.findOne({ where: { RoleName: 'Менеджер' } })
            if (!managerRole) {
                managerRole = await Roles.findOne({ where: { id: 2 } })
                if (!managerRole) {
                    // Создаем роль, если её нет
                    managerRole = await Roles.create({ RoleName: 'Менеджер' })
                }
            }

            const user = await Users.create({
                Login: login,
                Password: hashPassword,
                Email: email || null,
                Name: name || null,
                RoleId: managerRole.id,
                IsBlocked: false
            })

            const userWithRole = await Users.findOne({
                where: { id: user.id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            return res.json(userWithRole)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Обновить информацию менеджера
    async updateManager(req, res) {
        try {
            const { id } = req.params
            const { login, email, name, password } = req.body

            const user = await Users.findOne({
                where: { id, is_deleted: false },
                include: [{ model: Roles }]
            })

            if (!user) {
                return res.status(404).json({ message: 'Менеджер не найден' })
            }

            const roleName = user.role?.RoleName || user.Role?.RoleName
            if (roleName !== 'Менеджер') {
                return res.status(400).json({ message: 'Пользователь не является менеджером' })
            }

            const updateData = {}

            // Обновляем логин, если указан
            if (login && login !== user.Login) {
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
                
                const candidate = await Users.findOne({ 
                    where: { 
                        Login: login,
                        is_deleted: false,
                        id: { [require('sequelize').Op.ne]: id }
                    } 
                })
                if (candidate) {
                    return res.status(400).json({ message: 'Пользователь с таким логином уже существует' })
                }
                updateData.Login = login
            }

            // Обновляем email, если указан
            if (email !== undefined && email !== user.Email) {
                if (email) {
                    const emailCandidate = await Users.findOne({ 
                        where: { 
                            Email: email,
                            is_deleted: false,
                            id: { [require('sequelize').Op.ne]: id }
                        } 
                    })
                    if (emailCandidate) {
                        return res.status(400).json({ message: 'Пользователь с таким email уже существует' })
                    }
                }
                updateData.Email = email || null
            }

            // Обновляем имя, если указано
            if (name !== undefined) {
                updateData.Name = name || null
            }

            // Обновляем пароль, если указан
            if (password) {
                // Валидация пароля
                if (password.length < 6) {
                    return res.status(400).json({ message: 'Пароль должен содержать минимум 6 символов' })
                }
                if (!/[a-zA-Zа-яА-ЯёЁ]/.test(password)) {
                    return res.status(400).json({ message: 'Пароль должен содержать хотя бы одну букву' })
                }
                
                const hashPassword = await bcrypt.hash(password, 5)
                updateData.Password = hashPassword
            }

            await Users.update(updateData, { where: { id } })

            const updatedUser = await Users.findOne({
                where: { id },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            return res.json(updatedUser)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Удалить менеджера (логическое удаление)
    async deleteManager(req, res) {
        try {
            const { id } = req.params
            const user = await Users.findOne({
                where: { id },
                include: [{ model: Roles }]
            })

            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            const roleName = user.role?.RoleName || user.Role?.RoleName
            if (roleName !== 'Менеджер') {
                return res.status(400).json({ message: 'Пользователь не является менеджером' })
            }

            // Логическое удаление
            await Users.update({ is_deleted: true }, { where: { id } })
            return res.json({ message: 'Менеджер удален' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Обновить профиль пользователя (имя, фото)
    async updateProfile(req, res) {
        try {
            const userLogin = req.user?.login
            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            const { Name, Email, Login, oldPassword, newPassword } = req.body
            const updateData = {}

            // Проверяем, что пользователь существует
            const currentUser = await Users.findOne({ where: { Login: userLogin } })
            if (!currentUser) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            if (Login !== undefined && Login !== userLogin) {
                // Валидация логина
                if (Login.trim().length < 3) {
                    return res.status(400).json({ message: 'Логин должен содержать минимум 3 символа' })
                }
                if (Login.trim().length > 30) {
                    return res.status(400).json({ message: 'Логин не должен превышать 30 символов' })
                }
                if (!/^[a-zA-Zа-яА-ЯёЁ0-9_]+$/.test(Login)) {
                    return res.status(400).json({ message: 'Логин может содержать только буквы, цифры и символ _' })
                }
                
                // Проверяем, не занят ли логин другим пользователем
                const loginUser = await Users.findOne({ 
                    where: { 
                        Login: Login,
                        is_deleted: false
                    } 
                })
                if (loginUser) {
                    return res.status(400).json({ message: 'Логин уже используется другим пользователем' })
                }
                updateData.Login = Login
            }

            if (Name !== undefined) {
                updateData.Name = Name
            }

            if (Email !== undefined) {
                // Проверяем, не занят ли email другим пользователем
                if (Email) {
                    const emailUser = await Users.findOne({ 
                        where: { 
                            Email: Email,
                            Login: { [require('sequelize').Op.ne]: userLogin },
                            is_deleted: false
                        } 
                    })
                    if (emailUser) {
                        return res.status(400).json({ message: 'Email уже используется другим пользователем' })
                    }
                }
                updateData.Email = Email
            }

            // Обрабатываем смену пароля
            if (oldPassword && newPassword) {
                // Проверяем старый пароль
                const user = await Users.findOne({ where: { Login: userLogin } })
                if (!user) {
                    return res.status(404).json({ message: 'Пользователь не найден' })
                }
                
                const isPasswordValid = bcrypt.compareSync(oldPassword, user.Password)
                if (!isPasswordValid) {
                    return res.status(400).json({ message: 'Неверный текущий пароль' })
                }
                
                // Хешируем новый пароль
                if (newPassword.length < 6) {
                    return res.status(400).json({ message: 'Новый пароль должен содержать минимум 6 символов' })
                }
                if (!/[a-zA-Zа-яА-ЯёЁ]/.test(newPassword)) {
                    return res.status(400).json({ message: 'Пароль должен содержать хотя бы одну букву' })
                }
                
                const hashPassword = await bcrypt.hash(newPassword, 5)
                updateData.Password = hashPassword
            }

            // Обрабатываем загруженное фото
            if (req.file) {
                const user = await Users.findOne({ where: { Login: userLogin } })
                
                // Удаляем старое фото, если оно существует
                if (user.Photo && user.Photo.startsWith('/uploads/')) {
                    const oldFilePath = path.join(__dirname, '..', user.Photo)
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath)
                    }
                }

                updateData.Photo = `/uploads/images/${req.file.filename}`
            }

            const finalLogin = updateData.Login || userLogin
            await Users.update(updateData, { where: { Login: userLogin } })

            const updatedUser = await Users.findOne({
                where: { Login: finalLogin },
                include: [{ model: Roles }],
                attributes: { exclude: ['Password'] }
            })

            // Если логин был изменен, нужно обновить токен
            if (updateData.Login) {
                const jwt = require('jsonwebtoken')
                const generateJwt = (id, login, roleId) => {
                    return jwt.sign(
                        { id, login, roleId },
                        process.env.SECRET_KEY || 'your-secret-key',
                        { expiresIn: '24h' }
                    )
                }
                const newToken = generateJwt(updatedUser.id, updatedUser.Login, updatedUser.RoleId)
                return res.json({ user: updatedUser, token: newToken })
            }

            return res.json(updatedUser)
        } catch (e) {
            // Удаляем загруженный файл в случае ошибки
            if (req.file) {
                const filePath = path.join(__dirname, '../uploads/images', req.file.filename)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
            }
            return res.status(500).json({ message: e.message })
        }
    }

    // Удалить свой аккаунт (логическое удаление)
    async deleteOwnAccount(req, res) {
        try {
            const userLogin = req.user?.login
            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            const user = await Users.findOne({ where: { Login: userLogin } })
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }

            // Проверяем, что пользователь не админ или менеджер
            const userWithRole = await Users.findOne({
                where: { Login: userLogin },
                include: [{ model: Roles }]
            })

            const roleName = userWithRole.role?.RoleName || userWithRole.Role?.RoleName
            if (roleName === 'Администратор' || roleName === 'Менеджер') {
                return res.status(403).json({ message: 'Администраторы и менеджеры не могут удалить свой аккаунт' })
            }

            // Логическое удаление
            await Users.update({ is_deleted: true }, { where: { Login: userLogin } })
            return res.json({ message: 'Аккаунт удален' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new UserController()

