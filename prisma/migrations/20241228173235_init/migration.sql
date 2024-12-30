/*
  Warnings:

  - Added the required column `dollar` to the `Products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `products` ADD COLUMN `dollar` DOUBLE NOT NULL;
