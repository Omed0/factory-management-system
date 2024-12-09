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
  employee: {
    name: 'Admin',
    phone: '07777777777',
    address: 'suli',
    monthSalary: 600,
  },
  employeeAction: (id: number) => ({
    employeeId: id,
    amount: 5,
    type: 'BONUS' as EmployeeActionType,
    dateAction: new Date(),
  }),
};

async function main() {
  try {
    console.log('Seeding database...');

    const user = await createUser(constants.user);
    console.log('Created user:', user);

    const box = await prisma.boxes.create({
      data: { amount: 0 },
    });
    console.log('Created box:', box);

    const updatedBox = await prisma.boxes.update({
      where: { id: 1 },
      data: { amount: 1000 },
    });
    console.log('Updated box:', updatedBox);

    const employee = await prisma.employee.create({
      data: constants.employee,
    });
    console.log('Created employee:', employee);

    const employeeAction = await prisma.employeeActions.create({
      data: constants.employeeAction(employee.id),
    });
    console.log('Create Employee Action:', employeeAction);

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
