const sequelize = require('../db')
const {DataTypes} = require('sequelize')

// --- Определения моделей ---

const Roles = sequelize.define('role', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    RoleName: {type: DataTypes.STRING, unique: true},
})

const Users = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    Password: {type: DataTypes.STRING, allowNull: false}, // Добавлен allowNull: false, т.к. это обязательно
    Login: {type: DataTypes.STRING, unique: true, allowNull: false}, // Используем Login как в схеме
    Name: {type: DataTypes.STRING}, // Добавлен Name
    CreatedAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW}, // Используем CreatedAt
    Photo: {type: DataTypes.STRING}, // Используем Photo
    Email: {type: DataTypes.STRING, unique: true}, // Используем Email
    IsBlocked: {type: DataTypes.BOOLEAN, defaultValue: false}, // Блокировка пользователя
    is_deleted: {type: DataTypes.BOOLEAN, defaultValue: false}, // Логическое удаление
})

const Categories = sequelize.define('category', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    CategoryName: {type: DataTypes.STRING, unique: true},
})

const Items = sequelize.define('item', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    Name: {type: DataTypes.STRING, unique: true, allowNull: false}, // Уникальное название
    Price: {type: DataTypes.INTEGER, allowNull: false}, // Цена
    Quantity: {type: DataTypes.INTEGER, defaultValue: 0}, // Количество (запасы)
    Description: {type: DataTypes.STRING},
    Smell: {type: DataTypes.STRING},
    Images: {type: DataTypes.STRING}, // Используем Images как в схеме
})

const States = sequelize.define('state', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    StateName: {type: DataTypes.STRING, unique: true, allowNull: false},
})

const Orders = sequelize.define('order', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    // Items: {type: DataTypes.STRING}, // Удаляем, т.к. товары будут в OrderItems
    Quantity: {type: DataTypes.INTEGER}, // Удаляем, т.к. общее количество будет рассчитываться
    Date: {type: DataTypes.DATE, defaultValue: DataTypes.NOW}, // Используем Date
    Adress: {type: DataTypes.STRING}, // Используем Adress
    TotalAmount: {type: DataTypes.INTEGER}, // Добавляем TotalAmount
    UserLogin: {type: DataTypes.STRING}, // Удаляем/заменяем, т.к. связь UserLogin с Users будет через FK
})

// Новая модель для связи "Многие ко многим" (Orders <-> Items)
const OrderItems = sequelize.define('order_item', {
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    Quantity: {type: DataTypes.INTEGER, allowNull: false},
    PriceAtPurchase: {type: DataTypes.INTEGER, allowNull: false},
    // OrderId и ItemId будут созданы автоматически как внешние ключи
})

const Carts = sequelize.define('cart', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    Quantity: {type: DataTypes.INTEGER, defaultValue: 1, allowNull: false},
    // UserLogin и ItemId будут созданы автоматически как внешние ключи
})

const Favourites = sequelize.define('favourite', { // Имя модели лучше в единственном числе
    id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    // UserLogin и ItemId будут созданы автоматически как внешние ключи
})

// --- Установка связей ---

// Users и Roles (1:М)
Roles.hasMany(Users)
Users.belongsTo(Roles, { foreignKey: 'RoleId' }) // FK 'Role' в таблице Users

// Items и Categories (1:М)
Categories.hasMany(Items)
Items.belongsTo(Categories, { foreignKey: 'CategoryId' }) // FK 'Category' в таблице Items

// Orders и States (1:М)
States.hasMany(Orders)
Orders.belongsTo(States, { foreignKey: 'State' }) // FK 'State' в таблице Orders

// Orders и Users (1:М)
Users.hasMany(Orders)
Orders.belongsTo(Users, { foreignKey: 'UserLogin', targetKey: 'Login' }) // FK 'UserLogin' в таблице Orders ссылается на Login в Users

// Orders и Items (М:М через OrderItems)
Orders.belongsToMany(Items, { through: OrderItems })
Items.belongsToMany(Orders, { through: OrderItems })

// Carts и Users (М:1)
Users.hasMany(Carts) // Один пользователь может иметь много товаров в корзине
Carts.belongsTo(Users, { foreignKey: 'UserLogin', targetKey: 'Login' }) // FK 'UserLogin' в таблице Carts

// Carts и Items (М:1)
Items.hasMany(Carts) // Один товар может быть во многих корзинах
Carts.belongsTo(Items, { foreignKey: 'ItemId' }) // FK 'ItemId' в таблице Carts

// Favourites и Users (М:1)
Users.hasMany(Favourites) // Один пользователь может иметь много избранных товаров
Favourites.belongsTo(Users, { foreignKey: 'UserLogin', targetKey: 'Login' }) // FK 'UserLogin' в таблице Favourites

// Favourites и Items (М:1)
Items.hasMany(Favourites) // Один товар может быть в списке избранного у многих
Favourites.belongsTo(Items, { foreignKey: 'ItemId' }) // FK 'ItemId' в таблице Favourites

// Экспорт моделей
module.exports = {
    Roles,
    Users,
    Categories,
    Items,
    States,
    Orders,
    OrderItems,
    Carts,
    Favourites,
}