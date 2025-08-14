/*
  Warnings:

  - You are about to drop the column `accommodation` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `maxLives` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `minLives` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `obstetrics` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `plans` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `typeProduct` on the `campaigns` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `campaigns` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `campaigns` DROP COLUMN `accommodation`,
    DROP COLUMN `maxLives`,
    DROP COLUMN `minLives`,
    DROP COLUMN `obstetrics`,
    DROP COLUMN `paymentMethod`,
    DROP COLUMN `plans`,
    DROP COLUMN `typeProduct`,
    DROP COLUMN `value`,
    ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `rules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `campaignId` BIGINT NOT NULL,
    `minLives` INTEGER NOT NULL,
    `maxLives` INTEGER NOT NULL,
    `plans` JSON NOT NULL,
    `paymentMethod` JSON NOT NULL,
    `accommodation` JSON NOT NULL,
    `typeProduct` JSON NOT NULL,
    `obstetrics` JSON NOT NULL,
    `value` TINYINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rules` ADD CONSTRAINT `rules_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
