/*
  Warnings:

  - Added the required column `accommodation` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `obstetrics` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethod` to the `campaigns` table without a default value. This is not possible if the table is not empty.
  - Added the required column `typeProduct` to the `campaigns` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `campaigns` ADD COLUMN `accommodation` JSON NOT NULL,
    ADD COLUMN `obstetrics` JSON NOT NULL,
    ADD COLUMN `paymentMethod` JSON NOT NULL,
    ADD COLUMN `typeProduct` JSON NOT NULL;
