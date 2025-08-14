import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Criar campanhas de exemplo
  const campaign1 = await prisma.campaign.upsert({
    where: { id: 1n },
    update: {},
    create: {
      id: 1n,
      name: 'Campanha de Verão',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      isDefault: true,
      minLives: 5,
      maxLives: 20,
      plans: [1, 2, 3, 4, 5],
      value: 25, // 25%
      paymentMethod: ['PIX', 'CREDITCARD'],
      accommodation: ['APARTMENT'],
      typeProduct: ['withParticipation'],
      obstetrics: ['withObstetric'],
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
      minLives: 3,
      maxLives: 15,
      plans: [1, 2, 3],
      value: 15, // 15%
      paymentMethod: ['PIX', 'BANKSLIP'],
      accommodation: ['INFIRMARY'],
      typeProduct: ['withoutParticipation'],
      obstetrics: ['withoutObstetric'],
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
      minLives: 10,
      maxLives: 30,
      plans: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      value: 50, // 50%
      paymentMethod: ['PIX', 'CREDITCARD', 'BANKSLIP'],
      accommodation: ['APARTMENT', 'INFIRMARY'],
      typeProduct: ['withParticipation', 'withoutParticipation'],
      obstetrics: ['withObstetric', 'withoutObstetric'],
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('Campaigns created:', { campaign1, campaign2, campaign3 })
}

main()
  .catch(e => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
