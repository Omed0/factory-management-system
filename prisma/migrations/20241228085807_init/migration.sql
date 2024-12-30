/*
  Warnings:

  - Added the required column `dollar` to the `CompanyPurchase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dollar` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dollar` to the `Expenses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dollar` to the `Sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `companypurchase` ADD COLUMN `dollar` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `dollar` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `expenses` ADD COLUMN `dollar` DOUBLE NOT NULL;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `dollar` DOUBLE NOT NULL;
