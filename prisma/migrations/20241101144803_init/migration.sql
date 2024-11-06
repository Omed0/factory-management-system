/*
  Warnings:

  - Made the column `amount` on table `employeeactions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `employeeactions` MODIFY `amount` DOUBLE NOT NULL;
