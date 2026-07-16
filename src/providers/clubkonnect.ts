import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
    baseURL: env.CLUBKONNECT_BASE_URL,
    timeout: 30000,
});

// ─── Network code mapping ────────────────────────────────────────────────────

const NETWORK_CODES: Record<string, string> = {
    mtn: '01',
    airtel: '02',
    glo: '03',
    '9mobile': '04',
    etisalat: '04',
};

function networkCode(network: string): string {
    return NETWORK_CODES[network.toLowerCase()] ?? network;
}

// ─── Hardcoded data plan catalogue ──────────────────────────────────────────

export interface DataPlan {
    id: string;
    name: string;
    code: string;
    amount: number;
    network: string;
    validity: string;
}

const DATA_PLANS: Record<string, DataPlan[]> = {
    mtn: [
        { id: '168', name: '500MB', code: '168', amount: 150,  network: 'MTN', validity: '1 day' },
        { id: '169', name: '1GB',   code: '169', amount: 200,  network: 'MTN', validity: '1 day' },
        { id: '170', name: '2GB',   code: '170', amount: 300,  network: 'MTN', validity: '2 days' },
        { id: '113', name: '1GB',   code: '113', amount: 300,  network: 'MTN', validity: '30 days' },
        { id: '110', name: '2GB',   code: '110', amount: 500,  network: 'MTN', validity: '30 days' },
        { id: '114', name: '5GB',   code: '114', amount: 1500, network: 'MTN', validity: '30 days' },
        { id: '116', name: '10GB',  code: '116', amount: 2500, network: 'MTN', validity: '30 days' },
    ],
    airtel: [
        { id: '100', name: '100MB', code: '100', amount: 50,   network: 'AIRTEL', validity: '1 day' },
        { id: '101', name: '1GB',   code: '101', amount: 200,  network: 'AIRTEL', validity: '1 day' },
        { id: '102', name: '1.5GB', code: '102', amount: 500,  network: 'AIRTEL', validity: '30 days' },
        { id: '103', name: '3GB',   code: '103', amount: 1000, network: 'AIRTEL', validity: '30 days' },
        { id: '104', name: '5GB',   code: '104', amount: 1500, network: 'AIRTEL', validity: '30 days' },
    ],
    glo: [
        { id: '200', name: '1GB',   code: '200', amount: 200,  network: 'GLO', validity: '1 day' },
        { id: '201', name: '2GB',   code: '201', amount: 500,  network: 'GLO', validity: '30 days' },
        { id: '202', name: '5GB',   code: '202', amount: 1500, network: 'GLO', validity: '30 days' },
        { id: '203', name: '10GB',  code: '203', amount: 2500, network: 'GLO', validity: '30 days' },
    ],
    '9mobile': [
        { id: '300', name: '1GB',  code: '300', amount: 300,  network: '9MOBILE', validity: '30 days' },
        { id: '301', name: '2GB',  code: '301', amount: 500,  network: '9MOBILE', validity: '30 days' },
        { id: '302', name: '5GB',  code: '302', amount: 1500, network: '9MOBILE', validity: '30 days' },
    ],
};

// ─── Shared credentials builder ───────────────────────────────────────────────

function credentials() {
    return {
        UserID: env.CLUBKONNECT_USER_ID,
        APIKey: env.CLUBKONNECT_API_KEY,
    };
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function purchaseAirtime(
    phoneNumber: string,
    amount: number,
    network: string,
    requestId: string,
) {
    try {
        const { data } = await client.get('/APIAirtimeV1.asp', {
            params: {
                ...credentials(),
                MobileNetwork: networkCode(network),
                Amount: amount,
                MobileNumber: phoneNumber,
                RequestID: requestId,
                CallBackURL: '',
            },
        });

        console.log('[clubkonnect.purchaseAirtime] response:', JSON.stringify(data));

        if (data?.STATUS !== 'SUCCESSFUL') {
            throw new Error(data?.RESPONSE ?? 'Airtime purchase failed');
        }

        return { success: true, data, message: 'Airtime purchased successfully' };
    } catch (err: any) {
        const message = err.message ?? err.response?.data?.RESPONSE ?? 'Airtime purchase failed';
        console.error('[clubkonnect.purchaseAirtime] error:', message);
        throw new Error(message);
    }
}

export async function purchaseData(
    phoneNumber: string,
    planCode: string,
    network: string,
    requestId: string,
) {
    try {
        const { data } = await client.get('/APIDatabundleV1.asp', {
            params: {
                ...credentials(),
                MobileNetwork: networkCode(network),
                DataPlan: planCode,
                MobileNumber: phoneNumber,
                RequestID: requestId,
                CallBackURL: '',
            },
        });

        console.log('[clubkonnect.purchaseData] response:', JSON.stringify(data));

        if (data?.STATUS !== 'SUCCESSFUL') {
            throw new Error(data?.RESPONSE ?? 'Data purchase failed');
        }

        return { success: true, data, message: 'Data purchased successfully' };
    } catch (err: any) {
        const message = err.message ?? err.response?.data?.RESPONSE ?? 'Data purchase failed';
        console.error('[clubkonnect.purchaseData] error:', message);
        throw new Error(message);
    }
}

export async function getDataPlans(network: string): Promise<DataPlan[]> {
    const key = network.toLowerCase().replace(/\s/g, '');
    return DATA_PLANS[key] ?? [];
}

export async function checkBalance(): Promise<number> {
    try {
        const { data } = await client.get('/APIWalletBalanceV1.asp', {
            params: credentials(),
        });

        console.log('[clubkonnect.checkBalance] response:', JSON.stringify(data));

        const balance = parseFloat(data?.BALANCE ?? '0');
        return isNaN(balance) ? 0 : balance;
    } catch (err: any) {
        const message = err.message ?? 'Failed to fetch Clubkonnect balance';
        console.error('[clubkonnect.checkBalance] error:', message);
        throw new Error(message);
    }
}

export async function queryTransaction(requestId: string) {
    try {
        const { data } = await client.get('/APIQueryV1.asp', {
            params: {
                ...credentials(),
                RequestID: requestId,
            },
        });

        console.log('[clubkonnect.queryTransaction] response:', JSON.stringify(data));

        return { success: data?.STATUS === 'SUCCESSFUL', data, message: data?.RESPONSE ?? '' };
    } catch (err: any) {
        const message = err.message ?? 'Transaction query failed';
        console.error('[clubkonnect.queryTransaction] error:', message);
        throw new Error(message);
    }
}
