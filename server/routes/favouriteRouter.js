const Router = require('express')
const router = new Router()
const favouriteController = require('../controllers/favouriteController')
const authMiddleware = require('../middleware/authMiddleware')

// Все роуты требуют авторизации
router.get('/:userLogin', authMiddleware, favouriteController.getAll)
router.post('/', authMiddleware, favouriteController.add)
router.delete('/:id', authMiddleware, favouriteController.delete)
router.delete('/item/:userLogin/:itemId', authMiddleware, favouriteController.deleteByItem)

module.exports = router








