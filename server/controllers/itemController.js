const { Items, Categories } = require('../models/models')
const { Op } = require('sequelize')
const path = require('path')
const fs = require('fs')

// Опциональная загрузка sharp для изменения размера изображений
let sharp = null
try {
    sharp = require('sharp')
} catch (e) {
    console.warn('Sharp не установлен. Изображения не будут изменяться до квадратного формата. Установите: npm install sharp')
}

class ItemController {
    async getAll(req, res) {
        try {
            let { categoryId, smell, search } = req.query
            let items
            
            if (categoryId) {
                items = await Items.findAll({
                    where: { CategoryId: categoryId },
                    include: [{ model: Categories }]
                })
            } else if (smell) {
                items = await Items.findAll({
                    where: { Smell: smell },
                    include: [{ model: Categories }]
                })
            } else if (search) {
                items = await Items.findAll({
                    where: {
                        Name: {
                            [Op.iLike]: `%${search}%`
                        }
                    },
                    include: [{ model: Categories }]
                })
            } else {
                items = await Items.findAll({
                    include: [{ model: Categories }]
                })
            }

            return res.json(items)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async getOne(req, res) {
        try {
            const { id } = req.params
            const item = await Items.findOne({
                where: { id },
                include: [{ model: Categories }]
            })

            if (!item) {
                return res.status(404).json({ message: 'Товар не найден' })
            }

            return res.json(item)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async create(req, res) {
        try {
            const { Name, Price, Quantity, Description, Smell, CategoryId } = req.body
            
            // Получаем путь к загруженному файлу
            let imagePath = null
            if (req.file) {
                const originalPath = path.join(__dirname, '../uploads/images', req.file.filename)
                // Изменяем размер изображения до квадрата 500x500, если sharp установлен
                if (sharp) {
                    try {
                        await sharp(originalPath)
                            .resize(500, 500, {
                                fit: 'cover',
                                position: 'center'
                            })
                            .toFile(originalPath + '.resized')
                        
                        // Удаляем оригинальный файл и переименовываем обработанный
                        fs.unlinkSync(originalPath)
                        fs.renameSync(originalPath + '.resized', originalPath)
                    } catch (resizeError) {
                        console.error('Ошибка при изменении размера изображения:', resizeError)
                        // Продолжаем с оригинальным файлом, если не удалось изменить размер
                    }
                }
                imagePath = `/uploads/images/${req.file.filename}`
            }

            const item = await Items.create({
                Name,
                Price,
                Quantity: Quantity || 0,
                Description,
                Smell,
                Images: imagePath,
                CategoryId
            })

            return res.json(item)
        } catch (e) {
            // Удаляем загруженный файл в случае ошибки
            if (req.file) {
                const filePath = path.join(__dirname, '../uploads/images', req.file.filename)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
                if (fs.existsSync(filePath + '.resized')) {
                    fs.unlinkSync(filePath + '.resized')
                }
            }
            return res.status(500).json({ message: e.message })
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params
            const { Name, Price, Quantity, Description, Smell, CategoryId } = req.body

            const item = await Items.findOne({ where: { id } })
            if (!item) {
                return res.status(404).json({ message: 'Товар не найден' })
            }

            // Если загружен новый файл, удаляем старый
            let imagePath = item.Images
            if (req.file) {
                // Удаляем старое изображение, если оно существует
                if (item.Images && item.Images.startsWith('/uploads/')) {
                    const oldFilePath = path.join(__dirname, '..', item.Images)
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath)
                    }
                }
                
                const newFilePath = path.join(__dirname, '../uploads/images', req.file.filename)
                // Изменяем размер изображения до квадрата 500x500, если sharp установлен
                if (sharp) {
                    try {
                        await sharp(newFilePath)
                            .resize(500, 500, {
                                fit: 'cover',
                                position: 'center'
                            })
                            .toFile(newFilePath + '.resized')
                        
                        // Удаляем оригинальный файл и переименовываем обработанный
                        fs.unlinkSync(newFilePath)
                        fs.renameSync(newFilePath + '.resized', newFilePath)
                    } catch (resizeError) {
                        console.error('Ошибка при изменении размера изображения:', resizeError)
                        // Продолжаем с оригинальным файлом, если не удалось изменить размер
                    }
                }
                
                imagePath = `/uploads/images/${req.file.filename}`
            }

            await Items.update(
                { Name, Price, Quantity, Description, Smell, Images: imagePath, CategoryId },
                { where: { id } }
            )

            const updatedItem = await Items.findOne({ where: { id } })
            return res.json(updatedItem)
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

    async delete(req, res) {
        try {
            const { id } = req.params
            const item = await Items.findOne({ where: { id } })
            
            if (!item) {
                return res.status(404).json({ message: 'Товар не найден' })
            }

            // Удаляем файл изображения, если он существует
            if (item.Images && item.Images.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '..', item.Images)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
            }

            await Items.destroy({ where: { id } })
            return res.json({ message: 'Товар удален' })
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }
}

module.exports = new ItemController()

