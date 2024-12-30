/*
  Warnings:

  - Added the required column `dollar` to the `EmployeeActions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `employeeactions` ADD COLUMN `dollar` DOUBLE NOT NULL;
