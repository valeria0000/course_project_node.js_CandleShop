const { Users, Roles, States, Categories } = require('./models/models')
const bcrypt = require('bcrypt')

async function seed() {
    try {
        // Создаем роли, если их нет
        const adminRole = await Roles.findOrCreate({
            where: { RoleName: 'Администратор' },
            defaults: { RoleName: 'Администратор' }
        })

        const managerRole = await Roles.findOrCreate({
            where: { RoleName: 'Менеджер' },
            defaults: { RoleName: 'Менеджер' }
        })

        const userRole = await Roles.findOrCreate({
            where: { RoleName: 'Пользователь' },
            defaults: { RoleName: 'Пользователь' }
        })

        // Создаем дефолтного админа, если его нет
        const existingAdmin = await Users.findOne({ where: { Login: 'admin' } })
        
        if (!existingAdmin) {
            const hashPassword = await bcrypt.hash('1111', 5)
            await Users.create({
                Login: 'admin',
                Password: hashPassword,
                RoleId: adminRole[0].id,
                IsBlocked: false
            })
            console.log('Дефолтный администратор создан: логин - admin, пароль - 1111')
        } else {
            console.log('Администратор уже существует')
        }

        // Создаем статусы заказов, если их нет
        await States.findOrCreate({
            where: { StateName: 'Новый' },
            defaults: { StateName: 'Новый' }
        })

        await States.findOrCreate({
            where: { StateName: 'В обработке' },
            defaults: { StateName: 'В обработке' }
        })

        await States.findOrCreate({
            where: { StateName: 'Выполнен' },
            defaults: { StateName: 'Выполнен' }
        })

        // Создаем статус "Cancelled" (английское название)
        await States.findOrCreate({
            where: { StateName: 'Cancelled' },
            defaults: { StateName: 'Cancelled' }
        })

        // Также создаем русское название для обратной совместимости, если его еще нет
        await States.findOrCreate({
            where: { StateName: 'Отменен' },
            defaults: { StateName: 'Отменен' }
        })

        // Создаем категории товаров, если их нет
        await Categories.findOrCreate({
            where: { CategoryName: 'свечи' },
            defaults: { CategoryName: 'свечи' }
        })

        await Categories.findOrCreate({
            where: { CategoryName: 'благовония' },
            defaults: { CategoryName: 'благовония' }
        })

        await Categories.findOrCreate({
            where: { CategoryName: 'подсвечники' },
            defaults: { CategoryName: 'подсвечники' }
        })

        console.log('Seed выполнен успешно')
    } catch (error) {
        console.error('Ошибка при выполнении seed:', error)
    }
}

module.exports = seed
