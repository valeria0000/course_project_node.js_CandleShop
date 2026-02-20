const Router = require('express')
const router = new Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/authMiddleware')
const { upload, uploadProfile } = require('../middleware/uploadMiddleware')

// Роуты для профиля (доступны любому авторизованному пользователю)
router.put('/profile', authMiddleware, uploadProfile.single('Photo'), userController.updateProfile)
router.delete('/profile', authMiddleware, userController.deleteOwnAccount)

// Все остальные роуты требуют авторизации и роли администратора
router.get('/', authMiddleware, authMiddleware.checkRole('Администратор'), userController.getAll)
router.get('/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.getOne)
router.post('/block/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.block)
router.post('/unblock/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.unblock)
router.delete('/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.delete)
router.post('/manager', authMiddleware, authMiddleware.checkRole('Администратор'), userController.createManager)
router.put('/manager/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.updateManager)
router.delete('/manager/:id', authMiddleware, authMiddleware.checkRole('Администратор'), userController.deleteManager)

module.exports = router





