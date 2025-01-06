import { prisma } from '@/lib/client';
import { createUser } from '@/server/access-layer/user';
//import { faker } from '@faker-js/faker';
//import {
//  createCompany,
//  createCompanyPurchase,
//  createCompanyPurchaseInfo,
//} from '@/server/access-layer/company';
//import { createCustomer } from '@/server/access-layer/customer';
//import {
//  createSaleForCustomer,
//  createProductSaleList,
//  createPaidLoanSaleList,
//  increaseQuantitySaleItem,
//  discountForSaleInvoice,
//  finishSaleInvoice,
//} from '@/server/access-layer/sale';
//import {
//  createEmployee,
//  createEmployeeAction,
//} from '@/server/access-layer/employee';
//import { createExpense } from '@/server/access-layer/expense';
//import { createProduct } from '@/server/access-layer/product';

const constants = {
  user: {
    email: 'admin@admin.com',
    name: 'admin',
    password: 'adminadmin',
    image: '/images/logo.jpg',
    phone: '07725425600',
  },
};

async function generate_for_production() {
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

//async function generate_faker() {
//  console.log('Seeding database with relational fake data...');
//  const numberOfEntries = faker.number.int({ min: 200, max: 300 });
//  const dollar = faker.number.int({ min: 1400, max: 1500 });
//  await prisma.dollar.create({
//    data: { price: 1500 },
//  });
//  console.log('Generated dollar:', dollar);

//  const user = await createUser(constants.user);
//  console.log('Created user:', user);

//  for (let i = 0; i < numberOfEntries; i++) {
//    try {
//      const customer = await createCustomer({
//        name: faker.person.fullName(),
//        address: faker.location.streetAddress(),
//        phone: faker.phone.number({ style: 'international' }).slice(0, 10),
//        isSalariedeEmployee: faker.datatype.boolean(),
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      const saleType = faker.helpers.arrayElement(['CASH', 'LOAN']);
//      const monthlyPaid =
//        saleType === 'CASH' ? 0 : faker.number.int({ min: 80, max: 150 });
//      const sale = await createSaleForCustomer({
//        saleValues: {
//          customerId: customer.id,
//          saleNumber: `SAL-${faker.date.anytime().getTime() + i}`,
//          dollar: parseFloat(dollar.toFixed(2)),
//          saleDate: faker.date.recent(),
//          note: faker.lorem.sentence(),
//          monthlyPaid,
//          saleType,
//        },
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      const product = await createProduct({
//        image: faker.image.avatarGitHub(),
//        name: faker.commerce.productName(),
//        price: faker.number.int({ min: 10, max: 50 }),
//        dollar: parseFloat(dollar.toFixed(2)),
//        unitType: faker.helpers.arrayElement(['PIECE', 'METER']),
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      const saleItem = await createProductSaleList({
//        product: {
//          saleId: sale.id,
//          productId: product.id,
//          quantity: faker.number.int({ min: 1, max: 5 }),
//          price: product.price,
//        },
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      await discountForSaleInvoice({
//        id: sale.id,
//        discount: faker.number.int({ min: 0, max: 20 }),
//      });

//      await increaseQuantitySaleItem({
//        id: saleItem.id,
//        amount: faker.number.int({ min: 1, max: 5 }),
//      });

//      await finishSaleInvoice({
//        isFinished: faker.datatype.boolean(),
//        id: sale.id,
//      });

//      if (saleType === 'LOAN') {
//        await createPaidLoanSaleList({
//          paidLoanInfo: {
//            saleId: sale.id,
//            amount: (sale.totalAmount || 0) / 2,
//            paidDate: faker.date.recent(),
//            note: faker.lorem.sentence(),
//          },
//        });
//      }

//      const company = await createCompany({
//        name: faker.company.name(),
//        phone: faker.phone.number({ style: 'international' }).slice(0, 10),
//        address: faker.location.streetAddress(),
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      const totalAmount = faker.number.int({ min: 50, max: 150 });
//      const companyPurchase = await createCompanyPurchase({
//        companyId: company.id,
//        name: faker.commerce.productName(),
//        totalAmount,
//        totalRemaining: totalAmount / 2.5,
//        type: faker.helpers.arrayElement(['CASH', 'LOAN']),
//        purchaseDate: faker.date.recent(),
//        dollar: parseFloat(dollar.toFixed(2)),
//        note: faker.lorem.sentence(),
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      if (companyPurchase.type === 'LOAN') {
//        await createCompanyPurchaseInfo({
//          companyPurchaseId: companyPurchase.id,
//          amount: companyPurchase.totalAmount / 2,
//          date: new Date(),
//          note: faker.lorem.sentence(),
//        });
//      }

//      const employee = await createEmployee({
//        name: faker.person.fullName(),
//        phone: faker.phone.number({ style: 'international' }).slice(0, 10),
//        address: faker.location.streetAddress(),
//        image: faker.image.avatarGitHub(),
//        monthSalary: faker.number.int({ min: 400, max: 600 }),
//        dollar: parseFloat(dollar.toFixed(2)),
//      }).then((res) => {
//        if ('error' in res) {
//          throw new Error(res.error);
//        }
//        return res;
//      });

//      await createEmployeeAction({
//        employeeId: employee.id,
//        type: faker.helpers.arrayElement([
//          'PUNISHMENT',
//          'BONUS',
//          'ABSENT',
//          'OVERTIME',
//        ]),
//        amount: faker.number.int({ min: 3, max: 20 }),
//        dollar: parseFloat(dollar.toFixed(2)),
//        note: faker.lorem.sentence(),
//        dateAction: faker.date.recent(),
//      });

//      await createExpense({
//        title: faker.lorem.words(),
//        amount: faker.number.int({ min: 10, max: 100 }),
//        dollar: parseFloat(dollar.toFixed(2)),
//        note: faker.lorem.sentence(),
//      });
//      console.log(`Generated fake data for entry ${i}.`);
//    } catch (error) {
//      console.error(`Error generating faker data for entry ${i}:`, error);
//    }
//  }

//  console.log('Finished seeding database with fake data.');
//}

async function main() {
  //if (process.argv.includes('--faker')) {
  //  await generate_faker();
  //} else {
  await generate_for_production();
  //}
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
