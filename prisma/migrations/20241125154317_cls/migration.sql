-- AlterTable
ALTER TABLE `boxes` ADD COLUMN `dollar` DOUBLE NOT NULL DEFAULT 1500;

-- AlterTable
ALTER TABLE `sales` MODIFY `totalAmount` DOUBLE NOT NULL DEFAULT 0;
