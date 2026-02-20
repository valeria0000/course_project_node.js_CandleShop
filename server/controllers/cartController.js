const { Carts, Items, Users } = require('../models/models')

class CartController {
    async getAll(req, res) {
        try {
            const userLogin = req.user?.login || req.params.userLogin
            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            const cartItems = await Carts.findAll({
                where: { UserLogin: userLogin },
                include: [
                    { model: Items },
                    { model: Users }
                ]
            })

            return res.json(cartItems)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async add(req, res) {
        try {
            // userLogin из токена или из body
            const userLogin = req.user?.login || req.body.userLogin
            const { itemId, quantity = 1 } = req.body

            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            if (!itemId) {
                return res.status(400).json({ message: 'ID товара обязателен' })
            }

            // Проверяем, существует ли уже такой товар в корзине
            const existingCartItem = await Carts.findOne({
                where: {
                    UserLogin: userLogin,
                    ItemId: itemId
                },
                include: [
                    { model: Items },
                    { model: Users }
                ]
            })

            if (existingCartItem) {
                // Увеличиваем количество
                existingCartItem.Quantity += quantity
                await existingCartItem.save()
                return res.json(existingCartItem)
            }

            const cartItem = await Carts.create({
                UserLogin: userLogin,
                ItemId: itemId,
                Quantity: quantity
            })

            const cartItemWithDetails = await Carts.findOne({
                where: { id: cartItem.id },
                include: [
                    { model: Items },
                    { model: Users }
                ]
            })

            return res.json(cartItemWithDetails)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params
            const userLogin = req.user?.login

            const cartItem = await Carts.findOne({ where: { id } })

            if (!cartItem) {
                return res.status(404).json({ message: 'Товар в корзине не найден' })
            }

            // Пользователь может удалять только из своей корзины
            if (userLogin && cartItem.UserLogin !== userLogin) {
                return res.status(403).json({ message: 'Нет доступа' })
            }

            await Carts.destroy({ where: { id } })
            return res.json({ message: 'Товар удален из корзины' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params
            const { quantity } = req.body
            const userLogin = req.user?.login

            if (!quantity || quantity < 1) {
                return res.status(400).json({ message: 'Количество должно быть больше 0' })
            }

            const cartItem = await Carts.findOne({ where: { id } })

            if (!cartItem) {
                return res.status(404).json({ message: 'Товар в корзине не найден' })
            }

            // Пользователь может обновлять только свою корзину
            if (userLogin && cartItem.UserLogin !== userLogin) {
                return res.status(403).json({ message: 'Нет доступа' })
            }

            cartItem.Quantity = quantity
            await cartItem.save()

            const cartItemWithDetails = await Carts.findOne({
                where: { id: cartItem.id },
                include: [
                    { model: Items },
                    { model: Users }
                ]
            })

            return res.json(cartItemWithDetails)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async clear(req, res) {
        try {
            const userLogin = req.user?.login || req.params.userLogin
            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            await Carts.destroy({ where: { UserLogin: userLogin } })
            return res.json({ message: 'Корзина очищена' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new CartController()

