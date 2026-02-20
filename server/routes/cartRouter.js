const Router = require('express')
const router = new Router()
const cartController = require('../controllers/cartController')
const authMiddleware = require('../middleware/authMiddleware')

// Все операции с корзиной требуют авторизации
router.get('/:userLogin', authMiddleware, cartController.getAll)
router.post('/', authMiddleware, cartController.add)
router.put('/:id', authMiddleware, cartController.update)
router.delete('/:id', authMiddleware, cartController.delete)
router.delete('/clear/:userLogin', authMiddleware, cartController.clear)

module.exports = router

