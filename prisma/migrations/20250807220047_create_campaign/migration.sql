-- CreateTable
CREATE TABLE `campaigns` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `minLives` INTEGER NOT NULL,
    `maxLives` INTEGER NOT NULL,
    `plans` JSON NOT NULL,
    `value` TINYINT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
