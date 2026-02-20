const Router = require('express')
const router = new Router()
const itemController = require('../controllers/itemController')
const authMiddleware = require('../middleware/authMiddleware')
const { upload } = require('../middleware/uploadMiddleware')

// Просмотр доступен всем (гостям, пользователям, менеджерам, админам)
router.get('/', itemController.getAll)
router.get('/:id', itemController.getOne)

// Создание, редактирование и удаление только для админа
router.post('/', authMiddleware, authMiddleware.checkRole('Администратор'), upload.single('image'), itemController.create)
router.put('/:id', authMiddleware, authMiddleware.checkRole('Администратор'), upload.single('image'), itemController.update)
router.delete('/:id', authMiddleware, authMiddleware.checkRole('Администратор'), itemController.delete)

module.exports = router

