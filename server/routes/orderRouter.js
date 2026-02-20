const Router = require('express')
const router = new Router()
const orderController = require('../controllers/orderController')
const authMiddleware = require('../middleware/authMiddleware')

// Создание заказа доступно авторизованным пользователям
router.post('/', authMiddleware, orderController.create)

// Просмотр заказов доступен авторизованным (пользователи видят свои, менеджеры/админы - все)
router.get('/', authMiddleware, orderController.getAll)
router.get('/:id', authMiddleware, orderController.getOne)

// Смена статуса только для менеджеров и админов
router.put('/:id/status', authMiddleware, authMiddleware.checkRole('Менеджер', 'Администратор'), orderController.updateStatus)

// Отмена заказа доступна авторизованным пользователям (свои заказы) и менеджерам/админам (любые)
router.post('/:id/cancel', authMiddleware, orderController.cancel)

module.exports = router

