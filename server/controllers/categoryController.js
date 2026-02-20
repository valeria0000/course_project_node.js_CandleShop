const { Categories } = require('../models/models')

class CategoryController {
    async getAll(req, res) {
        try {
            const categories = await Categories.findAll()
            return res.json(categories)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async getOne(req, res) {
        try {
            const { id } = req.params
            const category = await Categories.findOne({ where: { id } })

            if (!category) {
                return res.status(404).json({ message: 'Категория не найдена' })
            }

            return res.json(category)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async create(req, res) {
        try {
            const { CategoryName } = req.body
            const category = await Categories.create({ CategoryName })
            return res.json(category)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new CategoryController()








