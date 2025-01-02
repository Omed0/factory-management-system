import { EmployeeActionType } from '@prisma/client';
import { prisma } from '../src/lib/client';
import { createUser } from '../server/access-layer/user';

const constants = {
  user: {
    email: 'admin@admin.com',
    name: 'admin',
    password: 'adminadmin',
    image: 'https://via.placeholder.com/150',
    phone: '07777777777',
  },
};

async function main() {
  try {
    console.log('Seeding database...');

    const user = await createUser(constants.user);
    console.log('Created user:', user);

    const dollar = await prisma.dollar.create({
      data: { price: 1500 },
    });
    console.log('dollar:', dollar);

    console.log('Seeding completed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
