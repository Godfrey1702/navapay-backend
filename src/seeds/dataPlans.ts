import { prisma } from '../database/prisma.js';

const plans = [
    { network: 'MTN',     name: '500MB Weekly',  code: '500',  amount: 350, validity: '7 days',  provider: 'clubkonnect' },
    { network: 'MTN',     name: '1GB Weekly',    code: '1000', amount: 450, validity: '7 days',  provider: 'clubkonnect' },
    { network: 'GLO',     name: '200MB 14 days', code: '200',  amount: 100, validity: '14 days', provider: 'clubkonnect' },
    { network: 'GLO',     name: '500MB 7 days',  code: '500',  amount: 250, validity: '7 days',  provider: 'clubkonnect' },
    { network: '9MOBILE', name: '500MB',         code: '500',  amount: 280, validity: '30 days', provider: 'clubkonnect' },
    { network: '9MOBILE', name: '1GB',           code: '1000', amount: 550, validity: '30 days', provider: 'clubkonnect' },
    { network: 'AIRTEL',  name: '500MB',         code: '500',  amount: 280, validity: '30 days', provider: 'clubkonnect' },
    { network: 'AIRTEL',  name: '1GB',           code: '1000', amount: 450, validity: '30 days', provider: 'clubkonnect' },
];

async function main() {
    console.log('Seeding data plans...');
    for (const plan of plans) {
        const id = `seed-${plan.network}-${plan.code}`;
        await prisma.dataPlan.upsert({
            where: { id },
            update: { ...plan },
            create: { id, ...plan },
        });
        console.log(`  ✓ ${plan.network} ${plan.name}`);
    }
    console.log(`Done — ${plans.length} plans seeded.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
