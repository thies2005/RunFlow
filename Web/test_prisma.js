const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const p = await prisma.foodItem.create({
            data: {
                name: 'Test Food',
                brand: 'AI Scan',
                calories: 100,
                protein: 5,
                carbs: 10,
                fats: 2,
                servingSize: '100g'
            }
        });
        console.log('FoodItem created', p);

        const l = await prisma.nutritionLog.create({
            data: {
                userId: 'cmlz4y1l300007bbptfn4qer5',
                date: '2026-02-25',
                mealType: 'LUNCH',
                quantity: 1,
                calories: 100,
                protein: 5,
                carbs: 10,
                fats: 2,
                foodItemId: p.id
            }
        });
        console.log('Log created', l);
    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}
run();
