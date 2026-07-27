import { prisma } from '../database/prisma.js';

const plans = [
    // MTN
    { id: 'mtn-500',       network: 'MTN', code: '500',      name: '500MB Weekly (SME)',      amount: 340,  validity: '7 days' },
    { id: 'mtn-500.00',    network: 'MTN', code: '500.00',   name: '500MB Monthly (SME)',     amount: 340,  validity: '30 days' },
    { id: 'mtn-1000',      network: 'MTN', code: '1000',     name: '1GB Weekly (SME)',         amount: 450,  validity: '7 days' },
    { id: 'mtn-1000.00',   network: 'MTN', code: '1000.00',  name: '1GB Monthly (SME)',        amount: 620,  validity: '30 days' },
    { id: 'mtn-2000',      network: 'MTN', code: '2000',     name: '2GB Weekly (SME)',         amount: 900,  validity: '7 days' },
    { id: 'mtn-2000.00',   network: 'MTN', code: '2000.00',  name: '2GB Monthly (SME)',        amount: 1230, validity: '30 days' },
    { id: 'mtn-3000',      network: 'MTN', code: '3000',     name: '3GB Weekly (SME)',         amount: 1350, validity: '7 days' },
    { id: 'mtn-3000.00',   network: 'MTN', code: '3000.00',  name: '3GB Monthly (SME)',        amount: 1800, validity: '30 days' },
    { id: 'mtn-5000',      network: 'MTN', code: '5000',     name: '5GB Weekly (SME)',         amount: 2250, validity: '7 days' },
    { id: 'mtn-5000.00',   network: 'MTN', code: '5000.00',  name: '5GB Monthly (SME)',        amount: 2800, validity: '30 days' },
    { id: 'mtn-100.01',    network: 'MTN', code: '100.01',   name: '110MB Daily (Awoof)',      amount: 110,  validity: '1 day' },
    { id: 'mtn-200.01',    network: 'MTN', code: '200.01',   name: '230MB Daily (Awoof)',      amount: 215,  validity: '1 day' },
    { id: 'mtn-350.01',    network: 'MTN', code: '350.01',   name: '500MB Daily (Awoof)',      amount: 375,  validity: '1 day' },
    { id: 'mtn-500.01',    network: 'MTN', code: '500.01',   name: '1GB Daily (Awoof)',        amount: 535,  validity: '1 day' },
    { id: 'mtn-1500.02',   network: 'MTN', code: '1500.02',  name: '2GB Monthly (Direct)',     amount: 1600, validity: '30 days' },
    { id: 'mtn-2500.02',   network: 'MTN', code: '2500.02',  name: '3.5GB Monthly (Direct)',   amount: 2670, validity: '30 days' },
    { id: 'mtn-3500.02',   network: 'MTN', code: '3500.02',  name: '7GB Monthly (Direct)',     amount: 3750, validity: '30 days' },
    { id: 'mtn-4500.01',   network: 'MTN', code: '4500.01',  name: '10GB Monthly (Direct)',    amount: 4800, validity: '30 days' },
    { id: 'mtn-5500.01',   network: 'MTN', code: '5500.01',  name: '12.5GB Monthly (Direct)',  amount: 5870, validity: '30 days' },

    // GLO
    { id: 'glo-200',       network: 'GLO', code: '200',      name: '200MB 14 days (SME)',      amount: 105,  validity: '14 days' },
    { id: 'glo-500',       network: 'GLO', code: '500',      name: '500MB 7 days (SME)',       amount: 255,  validity: '7 days' },
    { id: 'glo-1000.11',   network: 'GLO', code: '1000.11',  name: '1GB 3 days (SME)',         amount: 355,  validity: '3 days' },
    { id: 'glo-1000.12',   network: 'GLO', code: '1000.12',  name: '1GB 7 days (SME)',         amount: 395,  validity: '7 days' },
    { id: 'glo-1000',      network: 'GLO', code: '1000',     name: '1GB 30 days (SME)',        amount: 510,  validity: '30 days' },
    { id: 'glo-2000',      network: 'GLO', code: '2000',     name: '2GB 30 days (SME)',        amount: 1020, validity: '30 days' },
    { id: 'glo-3000.12',   network: 'GLO', code: '3000.12',  name: '3GB 7 days (SME)',         amount: 1180, validity: '7 days' },
    { id: 'glo-3000',      network: 'GLO', code: '3000',     name: '3GB 30 days (SME)',        amount: 1530, validity: '30 days' },
    { id: 'glo-5000',      network: 'GLO', code: '5000',     name: '5GB 30 days (SME)',        amount: 2540, validity: '30 days' },
    { id: 'glo-10000',     network: 'GLO', code: '10000',    name: '10GB 30 days (SME)',       amount: 5080, validity: '30 days' },
    { id: 'glo-500.01',    network: 'GLO', code: '500.01',   name: '1.5GB 14 days (Direct)',   amount: 535,  validity: '14 days' },
    { id: 'glo-1000.01',   network: 'GLO', code: '1000.01',  name: '2.6GB 30 days (Direct)',   amount: 1070, validity: '30 days' },
    { id: 'glo-2000.01',   network: 'GLO', code: '2000.01',  name: '6.15GB 30 days (Direct)',  amount: 2140, validity: '30 days' },
    { id: 'glo-5000.01',   network: 'GLO', code: '5000.01',  name: '16GB 30 days (Direct)',    amount: 5340, validity: '30 days' },

    // AIRTEL
    { id: 'airtel-499.91',  network: 'AIRTEL', code: '499.91',  name: '1GB 1 day (Awoof)',        amount: 535,  validity: '1 day' },
    { id: 'airtel-499.92',  network: 'AIRTEL', code: '499.92',  name: '500MB 7 days (Direct)',    amount: 535,  validity: '7 days' },
    { id: 'airtel-799.91',  network: 'AIRTEL', code: '799.91',  name: '1GB 7 days (Direct)',      amount: 855,  validity: '7 days' },
    { id: 'airtel-999.92',  network: 'AIRTEL', code: '999.92',  name: '1.5GB 7 days (Direct)',    amount: 1070, validity: '7 days' },
    { id: 'airtel-1499.92', network: 'AIRTEL', code: '1499.92', name: '3.5GB 7 days (Direct)',    amount: 1605, validity: '7 days' },
    { id: 'airtel-1499.93', network: 'AIRTEL', code: '1499.93', name: '2GB 30 days (Direct)',     amount: 1605, validity: '30 days' },
    { id: 'airtel-1999.91', network: 'AIRTEL', code: '1999.91', name: '3GB 30 days (Direct)',     amount: 2140, validity: '30 days' },
    { id: 'airtel-2999.92', network: 'AIRTEL', code: '2999.92', name: '8GB 30 days (Direct)',     amount: 3210, validity: '30 days' },
    { id: 'airtel-3999.91', network: 'AIRTEL', code: '3999.91', name: '10GB 30 days (Direct)',    amount: 4280, validity: '30 days' },
    { id: 'airtel-4999.92', network: 'AIRTEL', code: '4999.92', name: '13GB 30 days (Direct)',    amount: 5350, validity: '30 days' },
    { id: 'airtel-7999.91', network: 'AIRTEL', code: '7999.91', name: '25GB 30 days (Direct)',    amount: 8560, validity: '30 days' },

    // 9MOBILE
    { id: '9mobile-50',       network: '9MOBILE', code: '50',       name: '50MB 30 days (SME)',       amount: 30,   validity: '30 days' },
    { id: '9mobile-100',      network: '9MOBILE', code: '100',      name: '100MB 30 days (SME)',      amount: 60,   validity: '30 days' },
    { id: '9mobile-300',      network: '9MOBILE', code: '300',      name: '300MB 30 days (SME)',      amount: 170,  validity: '30 days' },
    { id: '9mobile-500',      network: '9MOBILE', code: '500',      name: '500MB 30 days (SME)',      amount: 275,  validity: '30 days' },
    { id: '9mobile-1000',     network: '9MOBILE', code: '1000',     name: '1GB 30 days (SME)',        amount: 545,  validity: '30 days' },
    { id: '9mobile-2000',     network: '9MOBILE', code: '2000',     name: '2GB 30 days (SME)',        amount: 1085, validity: '30 days' },
    { id: '9mobile-3000',     network: '9MOBILE', code: '3000',     name: '3GB 30 days (SME)',        amount: 1630, validity: '30 days' },
    { id: '9mobile-5000',     network: '9MOBILE', code: '5000',     name: '5GB 30 days (SME)',        amount: 2710, validity: '30 days' },
    { id: '9mobile-10000',    network: '9MOBILE', code: '10000',    name: '10GB 30 days (SME)',       amount: 5415, validity: '30 days' },
    { id: '9mobile-100.01',   network: '9MOBILE', code: '100.01',   name: '100MB 1 day (Awoof)',      amount: 105,  validity: '1 day' },
    { id: '9mobile-500.01',   network: '9MOBILE', code: '500.01',   name: '650MB 3 days (Awoof)',     amount: 515,  validity: '3 days' },
    { id: '9mobile-1000.01',  network: '9MOBILE', code: '1000.01',  name: '1.1GB 30 days (Direct)',   amount: 1025, validity: '30 days' },
    { id: '9mobile-2000.01',  network: '9MOBILE', code: '2000.01',  name: '2.44GB 30 days (Direct)',  amount: 2050, validity: '30 days' },
    { id: '9mobile-5000.01',  network: '9MOBILE', code: '5000.01',  name: '6.5GB 30 days (Direct)',   amount: 5120, validity: '30 days' },
];

async function main() {
    console.log('Seeding data plans...');
    for (const plan of plans) {
        const { id, ...data } = plan;
        await prisma.dataPlan.upsert({
            where: { id },
            update: { ...data, isActive: true },
            create: { id, ...data, isActive: true },
        });
        console.log(`  ✓ ${plan.network} ${plan.name}`);
    }
    console.log(`Done — ${plans.length} plans seeded.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
