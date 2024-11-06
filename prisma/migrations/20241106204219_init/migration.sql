/*
  Warnings:

  - Added the required column `name` to the `CompanyPurchase` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `companypurchase` ADD COLUMN `name` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `purchasesinfo` MODIFY `note` VARCHAR(191) NULL;
