import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la carga de datos semilla (seeding)...');

  const franchiseImages = JSON.stringify([
    '/franchises/1/photo-1.webp',
    '/franchises/1/photo-2.webp',
    '/franchises/1/photo-3.webp',
    '/franchises/1/photo-4.webp',
  ]);

  // 1. Franquicia #1: Cronium Burger #1
  const franchise1 = await prisma.franchise.upsert({
    where: { id: 1 },
    update: {
      name: 'Cronium Burger #1',
      symbol: 'CB1',
      category: 'Restaurantes y Comida Rápida',
      description:
        'Franquicia de comida rápida de alta rentabilidad ubicada en la zona financiera de mayor tráfico peatonal.',
      location: 'Ciudad de México, MX',
      totalValuationUsdc: 100000.0,
      maxSupply: BigInt(1000),
      currentSupply: BigInt(0),
      pricePerTokenUsdc: 100.0,
      roiPercentage: 12.5,
      images: franchiseImages,
      isActive: true,
    },
    create: {
      id: 1,
      name: 'Cronium Burger #1',
      symbol: 'CB1',
      category: 'Restaurantes y Comida Rápida',
      description:
        'Franquicia de comida rápida de alta rentabilidad ubicada en la zona financiera de mayor tráfico peatonal.',
      location: 'Ciudad de México, MX',
      totalValuationUsdc: 100000.0,
      maxSupply: BigInt(1000),
      currentSupply: BigInt(0),
      pricePerTokenUsdc: 100.0,
      roiPercentage: 12.5,
      images: franchiseImages,
      isActive: true,
    },
  });

  console.log(`✅ Franquicia registrada: ${franchise1.name} (ID: ${franchise1.id})`);

  // 2. Usuario de prueba (Demo User)
  const demoWallet = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'.toLowerCase();
  const demoUser = await prisma.user.upsert({
    where: { walletAddress: demoWallet },
    update: {
      kycStatus: 'APPROVED',
      kycReferenceId: 'KYC-DEMO-001',
    },
    create: {
      walletAddress: demoWallet,
      email: 'demo@cronium.io',
      fullName: 'Usuario Demo Cronium',
      kycStatus: 'APPROVED',
      kycReferenceId: 'KYC-DEMO-001',
    },
  });

  console.log(`✅ Usuario demo registrado: ${demoUser.walletAddress}`);
  console.log('🚀 Seeding completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la ejecución del seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
