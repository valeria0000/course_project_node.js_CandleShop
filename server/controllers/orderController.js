const { Orders, OrderItems, Items, Users, States, Roles } = require('../models/models')
const { Op } = require('sequelize')
const sequelize = require('../db')

// Вспомогательная функция для получения orderItems с разными вариантами имён полей
async function findOrderItemsByOrderId(orderId) {
    // Пробуем разные варианты имён полей
    const variants = [
        { orderId: orderId },      // camelCase (стандарт Sequelize)
        { OrderId: orderId },      // PascalCase
    ]
    
    for (const whereCondition of variants) {
        try {
            const items = await OrderItems.findAll({ where: whereCondition })
            if (items.length > 0) {
                return items
            }
        } catch (error) {
            // Продолжаем пробовать другие варианты
            console.warn(`Не удалось найти OrderItems с условием ${JSON.stringify(whereCondition)}:`, error.message)
        }
    }
    
    // Если ничего не найдено, возвращаем пустой массив
    return []
}

// Вспомогательная функция для извлечения itemId из orderItem
function getItemIdFromOrderItem(orderItem) {
    const data = orderItem.toJSON ? orderItem.toJSON() : (orderItem.dataValues || orderItem)
    return data.itemId || data.ItemId || orderItem.itemId || orderItem.ItemId
}

// Вспомогательная функция для извлечения orderId из orderItem
function getOrderIdFromOrderItem(orderItem) {
    const data = orderItem.toJSON ? orderItem.toJSON() : (orderItem.dataValues || orderItem)
    return data.orderId || data.OrderId || orderItem.orderId || orderItem.OrderId
}

class OrderController {
    async create(req, res) {
        try {
            console.log('Order creation request body:', JSON.stringify(req.body, null, 2));
            console.log('User from token:', req.user);
            
            // userLogin берем из токена (req.user.login) или из body для обратной совместимости
            const userLogin = req.user?.login || req.user?.Login || req.body.userLogin
            const { items, address } = req.body

            console.log('Extracted userLogin:', userLogin);
            console.log('Items:', items);
            console.log('Address:', address);

            if (!userLogin) {
                console.error('No userLogin found');
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            if (!items || items.length === 0) {
                console.error('Cart is empty or items array is invalid');
                return res.status(400).json({ message: 'Корзина пуста' })
            }

            // Рассчитываем общую сумму
            let totalAmount = 0
            const orderItemsData = []

            for (const item of items) {
                const dbItem = await Items.findOne({ where: { id: item.id } })
                if (!dbItem) {
                    return res.status(404).json({ message: `Товар с id ${item.id} не найден` })
                }

                if (dbItem.Quantity < item.quantity) {
                    return res.status(400).json({ 
                        message: `Недостаточно товара "${dbItem.Name}". Доступно: ${dbItem.Quantity}` 
                    })
                }

                const itemTotal = dbItem.Price * item.quantity
                totalAmount += itemTotal

                orderItemsData.push({
                    itemId: item.id,
                    quantity: item.quantity,
                    priceAtPurchase: dbItem.Price
                })
            }

            // Создаем заказ
            const order = await Orders.create({
                UserLogin: userLogin,
                Adress: address,
                TotalAmount: totalAmount,
                State: 1 // Предполагаем, что 1 - это статус "Новый"
            })

            // Создаем записи о товарах в заказе.
            // В through-модели Sequelize по умолчанию создаёт внешние ключи orderId и itemId (в нижнем регистре),
            // поэтому используем именно такие имена, чтобы затем корректно выбирать записи.
            for (const orderItem of orderItemsData) {
                await OrderItems.create({
                    orderId: order.id,
                    itemId: orderItem.itemId,
                    Quantity: orderItem.quantity,
                    PriceAtPurchase: orderItem.priceAtPurchase
                })

                // Уменьшаем количество товара на складе
                const dbItem = await Items.findOne({ where: { id: orderItem.itemId } })
                await Items.update(
                    { Quantity: dbItem.Quantity - orderItem.quantity },
                    { where: { id: orderItem.itemId } }
                )
            }

            const orderWithDetails = await Orders.findOne({
                where: { id: order.id },
                include: [
                    { model: Users },
                    { model: States },
                    { 
                        model: Items,
                        through: { attributes: ['Quantity', 'PriceAtPurchase'] }
                    }
                ]
            })

            return res.json(orderWithDetails)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async getAll(req, res) {
        try {
            // Если пользователь авторизован и не админ/менеджер, показываем только его заказы
            const userLogin = req.user?.login || req.query.userLogin
            let userRole = req.userRole || req.query.role
            
            // Если роль не установлена, получаем её из БД
            if (!userRole && req.user?.id) {
                const user = await Users.findOne({
                    where: { id: req.user.id },
                    include: [{ model: Roles }]
                })
                if (user && user.role) {
                    userRole = user.role.RoleName
                }
            }
            
            let orders

            // Админы и менеджеры видят все заказы, пользователи - только свои
            if (userLogin && (userRole === 'Администратор' || userRole === 'Менеджер')) {
                // Админ/менеджер может фильтровать по userLogin, если указан
                const filterLogin = req.query.userLogin
                orders = await Orders.findAll({
                    where: filterLogin ? { UserLogin: filterLogin } : {},
                    include: [
                        { model: Users },
                        { model: States },
                        { 
                            model: Items,
                            through: { 
                                attributes: ['Quantity', 'PriceAtPurchase']
                            },
                            attributes: ['id', 'Name', 'Price', 'Description', 'Smell', 'Images']
                        }
                    ],
                    order: [['Date', 'DESC']]
                })
            } else if (userLogin) {
                // Обычный пользователь видит только свои заказы
                orders = await Orders.findAll({
                    where: { UserLogin: userLogin },
                    include: [
                        { model: Users },
                        { model: States },
                        { 
                            model: Items,
                            through: { 
                                attributes: ['Quantity', 'PriceAtPurchase']
                            },
                            attributes: ['id', 'Name', 'Price', 'Description', 'Smell', 'Images']
                        }
                    ],
                    order: [['Date', 'DESC']]
                })
            } else {
                return res.status(401).json({ message: 'Необходима авторизация' })
            }

            // Форматируем заказы, чтобы убедиться, что items правильно структурированы
            const formattedOrders = await Promise.all(orders.map(async (order) => {
                const orderData = order.toJSON ? order.toJSON() : order
                
                // Всегда получаем товары напрямую из OrderItems для гарантированной структуры
                const orderItems = await findOrderItemsByOrderId(order.id)
                
                const itemsData = await Promise.all(
                    orderItems.map(async (oi) => {
                        // Sequelize может вернуть поля в разных форматах
                        const itemId = getItemIdFromOrderItem(oi)
                        const item = await Items.findOne({ where: { id: itemId } })
                        if (!item) return null
                        
                        return {
                            id: item.id,
                            Name: item.Name,
                            Price: item.Price,
                            Description: item.Description,
                            Smell: item.Smell,
                            Images: item.Images,
                            order_item: {
                                Quantity: oi.Quantity,
                                PriceAtPurchase: oi.PriceAtPurchase
                            }
                        }
                    })
                )
                
                orderData.items = itemsData.filter(item => item !== null)
                
                return orderData
            }))

            return res.json(formattedOrders)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async getOne(req, res) {
        try {
            const { id } = req.params
            const userLogin = req.user?.login
            const userRole = req.userRole

            const order = await Orders.findOne({
                where: { id },
                include: [
                    { model: Users },
                    { model: States },
                    { 
                        model: Items,
                        through: { 
                            attributes: ['Quantity', 'PriceAtPurchase']
                        },
                        attributes: ['id', 'Name', 'Price', 'Description', 'Smell', 'Images']
                    }
                ]
            })

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' })
            }

            // Проверяем права: пользователь может видеть только свой заказ, менеджер/админ - любой
            if (userRole !== 'Администратор' && userRole !== 'Менеджер') {
                if (order.UserLogin !== userLogin) {
                    return res.status(403).json({ message: 'Нет доступа к этому заказу' })
                }
            }

            const orderData = order.toJSON ? order.toJSON() : order

            // Если items отсутствуют или пусты, получаем их вручную
                if (!orderData.items || orderData.items.length === 0) {
                    const orderItems = await findOrderItemsByOrderId(id)
                    
                    const itemsData = await Promise.all(
                        orderItems.map(async (oi) => {
                            const itemId = getItemIdFromOrderItem(oi)
                        const item = await Items.findOne({ where: { id: itemId } })
                        if (!item) return null
                        
                        return {
                            id: item.id,
                            Name: item.Name,
                            Price: item.Price,
                            Description: item.Description,
                            Smell: item.Smell,
                            Images: item.Images,
                            order_item: {
                                Quantity: oi.Quantity,
                                PriceAtPurchase: oi.PriceAtPurchase
                            }
                        }
                    })
                )
                
                orderData.items = itemsData.filter(item => item !== null)
            } else {
                // Форматируем существующие items
                orderData.items = orderData.items.map(item => {
                    if (!item.order_item) {
                        if (item.Quantity !== undefined || item.PriceAtPurchase !== undefined) {
                            item.order_item = {
                                Quantity: item.Quantity,
                                PriceAtPurchase: item.PriceAtPurchase
                            }
                        }
                    }
                    return item
                })
            }

            return res.json(orderData)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async updateStatus(req, res) {
        try {
            const { id } = req.params
            const { stateId } = req.body

            const order = await Orders.findOne({ where: { id } })
            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' })
            }

            await Orders.update(
                { State: stateId },
                { where: { id } }
            )

            const updatedOrder = await Orders.findOne({
                where: { id },
                include: [
                    { model: Users },
                    { model: States },
                    { 
                        model: Items,
                        through: { attributes: ['Quantity', 'PriceAtPurchase'] }
                    }
                ]
            })

            return res.json(updatedOrder)
        } catch (e) {
            return res.status(500).json({ message: e.message })
        }
    }

    async cancel(req, res) {
        try {
            const { id } = req.params
            const userLogin = req.user?.login
            let userRole = req.userRole

            // Если роль не установлена, получаем её из БД
            if (!userRole && req.user?.id) {
                const user = await Users.findOne({
                    where: { id: req.user.id },
                    include: [{ model: Roles }]
                })
                if (user && (user.role || user.Role)) {
                    userRole = user.role?.RoleName || user.Role?.RoleName
                }
            }

            const order = await Orders.findOne({
                where: { id },
                include: [{ model: States }]
            })

            if (!order) {
                return res.status(404).json({ message: 'Заказ не найден' })
            }

            // Проверяем права: пользователь может отменить только свой заказ, менеджер/админ - любой
            if (userRole !== 'Администратор' && userRole !== 'Менеджер') {
                if (order.UserLogin !== userLogin) {
                    return res.status(403).json({ message: 'Нет доступа к этому заказу' })
                }
            }

            // Находим статус "Отменен" (сначала ищем русское название, потом английское для обратной совместимости)
            let cancelledState = await States.findOne({ where: { StateName: 'Отменен' } })
            if (!cancelledState) {
                cancelledState = await States.findOne({ where: { StateName: 'Cancelled' } })
            }
            if (!cancelledState) {
                cancelledState = await States.findOne({ where: { id: 4 } })
                if (!cancelledState) {
                    return res.status(500).json({ message: 'Статус "Отменен" не найден' })
                }
            }

            // Возвращаем товары на склад
            const orderItems = await findOrderItemsByOrderId(id)

            for (const orderItem of orderItems) {
                try {
                // Используем вспомогательную функцию для извлечения itemId
                const itemId = getItemIdFromOrderItem(orderItem)
                    const quantity = orderItem.Quantity || orderItem.dataValues?.Quantity
                    
                    if (!itemId || !quantity) {
                        console.warn('Не удалось извлечь itemId или quantity из orderItem:', orderItem.toJSON ? orderItem.toJSON() : orderItem)
                        continue
                    }
                    
                    const item = await Items.findOne({ where: { id: itemId } })
                    if (item) {
                        await Items.update(
                            { Quantity: item.Quantity + quantity },
                            { where: { id: item.id } }
                        )
                    }
                } catch (itemError) {
                    console.error('Ошибка при возврате товара на склад:', itemError)
                    // Продолжаем обработку остальных товаров
                }
            }

            // Обновляем статус заказа
            await Orders.update(
                { State: cancelledState.id },
                { where: { id } }
            )

            const updatedOrder = await Orders.findOne({
                where: { id },
                include: [
                    { model: Users },
                    { model: States },
                    { 
                        model: Items,
                        through: { 
                            attributes: ['Quantity', 'PriceAtPurchase']
                        },
                        attributes: ['id', 'Name', 'Price', 'Description', 'Smell', 'Images']
                    }
                ]
            })
            
            const orderData = updatedOrder.toJSON ? updatedOrder.toJSON() : updatedOrder

            // Если items отсутствуют или пусты, получаем их вручную
                if (!orderData.items || orderData.items.length === 0) {
                    const orderItems = await findOrderItemsByOrderId(id)
                    
                    const itemsData = await Promise.all(
                        orderItems.map(async (oi) => {
                            const itemId = getItemIdFromOrderItem(oi)
                        const item = await Items.findOne({ where: { id: itemId } })
                        if (!item) return null
                        
                        return {
                            id: item.id,
                            Name: item.Name,
                            Price: item.Price,
                            Description: item.Description,
                            Smell: item.Smell,
                            Images: item.Images,
                            order_item: {
                                Quantity: oi.Quantity,
                                PriceAtPurchase: oi.PriceAtPurchase
                            }
                        }
                    })
                )
                
                orderData.items = itemsData.filter(item => item !== null)
            } else {
                // Форматируем существующие items
                orderData.items = orderData.items.map(item => {
                    if (!item.order_item) {
                        if (item.Quantity !== undefined || item.PriceAtPurchase !== undefined) {
                            item.order_item = {
                                Quantity: item.Quantity,
                                PriceAtPurchase: item.PriceAtPurchase
                            }
                        }
                    }
                    return item
                })
            }

            return res.json(orderData)
        } catch (e) {
            console.error('Ошибка при отмене заказа:', e)
            console.error('Stack trace:', e.stack)
            return res.status(500).json({ message: e.message || 'Внутренняя ошибка сервера' })
        }
    }
}

module.exports = new OrderController()

