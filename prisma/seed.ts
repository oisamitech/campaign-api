import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  await prisma.rule.deleteMany()
  await prisma.campaign.deleteMany()

  const campaign1 = await prisma.campaign.upsert({
    where: { id: 1n },
    update: {},
    create: {
      id: 1n,
      name: 'Campanha de Verão',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      isDefault: true,
      status: 'ACTIVE',
    },
  })

  const campaign2 = await prisma.campaign.upsert({
    where: { id: 2n },
    update: {},
    create: {
      id: 2n,
      name: 'Campanha de Inverno',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-08-31'),
      isDefault: false,
      status: 'ACTIVE',
    },
  })

  const campaign3 = await prisma.campaign.upsert({
    where: { id: 3n },
    update: {},
    create: {
      id: 3n,
      name: 'Campanha Especial',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-05-31'),
      isDefault: false,
      status: 'PAUSED',
    },
  })

  await prisma.rule.upsert({
    where: { id: 1n },
    update: {},
    create: {
      id: 1n,
      campaignId: campaign1.id,
      minLives: 5,
      maxLives: 20,
      plans: [1, 2, 3, 4, 5],
      value: 25,
      paymentMethod: ['PIX', 'CREDITCARD'],
      accommodation: ['APARTMENT'],
      typeProduct: ['withParticipation'],
      obstetrics: ['withObstetric'],
    },
  })

  await prisma.rule.upsert({
    where: { id: 2n },
    update: {},
    create: {
      id: 2n,
      campaignId: campaign2.id,
      minLives: 3,
      maxLives: 15,
      plans: [1, 2, 3],
      value: 15,
      paymentMethod: ['PIX', 'BANKSLIP'],
      accommodation: ['INFIRMARY'],
      typeProduct: ['withoutParticipation'],
      obstetrics: ['withoutObstetric'],
    },
  })

  await prisma.rule.upsert({
    where: { id: 3n },
    update: {},
    create: {
      id: 3n,
      campaignId: campaign2.id,
      minLives: 16,
      maxLives: 25,
      plans: [4, 5, 6],
      value: 30,
      paymentMethod: ['CREDITCARD'],
      accommodation: ['APARTMENT'],
      typeProduct: ['withParticipation'],
      obstetrics: ['withObstetric'],
    },
  })

  await prisma.rule.upsert({
    where: { id: 4n },
    update: {},
    create: {
      id: 4n,
      campaignId: campaign3.id,
      minLives: 10,
      maxLives: 30,
      plans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      value: 50,
      paymentMethod: ['PIX', 'CREDITCARD', 'BANKSLIP'],
      accommodation: ['APARTMENT', 'INFIRMARY'],
      typeProduct: ['withParticipation', 'withoutParticipation'],
      obstetrics: ['withObstetric', 'withoutObstetric'],
    },
  })

  await prisma.rule.upsert({
    where: { id: 5n },
    update: {},
    create: {
      id: 5n,
      campaignId: campaign3.id,
      minLives: 31,
      maxLives: 50,
      plans: [5, 6, 7, 8],
      value: 60,
      paymentMethod: ['PIX'],
      accommodation: ['APARTMENT'],
      typeProduct: ['withParticipation'],
      obstetrics: ['withoutObstetric'],
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('Campaigns created:', { campaign1, campaign2, campaign3 })
  console.log('Rules created: 5 rules distributed across campaigns')
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
