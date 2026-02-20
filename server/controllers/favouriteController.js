const { Favourites, Items, Users } = require('../models/models')

class FavouriteController {
    // Получить все избранное пользователя
    async getAll(req, res) {
        try {
            const userLogin = req.user?.login || req.params.userLogin
            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            const favourites = await Favourites.findAll({
                where: { UserLogin: userLogin },
                include: [{ model: Items }]
            })

            return res.json(favourites)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Добавить в избранное
    async add(req, res) {
        try {
            const userLogin = req.user?.login || req.body.userLogin
            const { itemId } = req.body

            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            if (!itemId) {
                return res.status(400).json({ message: 'ID товара обязателен' })
            }

            // Проверяем, существует ли уже такой товар в избранном
            const existingFavourite = await Favourites.findOne({
                where: {
                    UserLogin: userLogin,
                    ItemId: itemId
                }
            })

            if (existingFavourite) {
                return res.json(existingFavourite)
            }

            const favourite = await Favourites.create({
                UserLogin: userLogin,
                ItemId: itemId
            })

            const favouriteWithDetails = await Favourites.findOne({
                where: { id: favourite.id },
                include: [{ model: Items }]
            })

            return res.json(favouriteWithDetails)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Удалить из избранного
    async delete(req, res) {
        try {
            const { id } = req.params
            const userLogin = req.user?.login

            const favourite = await Favourites.findOne({ where: { id } })

            if (!favourite) {
                return res.status(404).json({ message: 'Товар в избранном не найден' })
            }

            // Пользователь может удалять только из своего избранного
            if (userLogin && favourite.UserLogin !== userLogin) {
                return res.status(403).json({ message: 'Нет доступа' })
            }

            await Favourites.destroy({ where: { id } })
            return res.json({ message: 'Товар удален из избранного' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    // Удалить по userLogin и itemId
    async deleteByItem(req, res) {
        try {
            const userLogin = req.user?.login || req.params.userLogin
            const { itemId } = req.params

            if (!userLogin) {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            const favourite = await Favourites.findOne({
                where: {
                    UserLogin: userLogin,
                    ItemId: itemId
                }
            })

            if (!favourite) {
                return res.status(404).json({ message: 'Товар в избранном не найден' })
            }

            await Favourites.destroy({
                where: {
                    UserLogin: userLogin,
                    ItemId: itemId
                }
            })

            return res.json({ message: 'Товар удален из избранного' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new FavouriteController()

