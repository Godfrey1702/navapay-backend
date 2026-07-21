import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
    baseURL: env.CLUBKONNECT_BASE_URL,
    timeout: 30000,
});

// ─── Network code mapping ────────────────────────────────────────────────────

const NETWORK_CODES: Record<string, string> = {
    mtn: '01',
    glo: '02',
    '9mobile': '03',
    etisalat: '03',
    t2mobile: '03',
    airtel: '04',
};

function networkCode(network: string): string {
    return NETWORK_CODES[network.toLowerCase()] ?? network;
}

// ─── Data plan type ──────────────────────────────────────────────────────────

export interface DataPlan {
    id: string;
    name: string;
    code: string;
    amount: number;
    network: string;
    validity: string;
}

// Used as fallback when the live API is unreachable
// Plan codes confirmed via live API probe against APIDatabundleV1.asp.
// GLO codes 200 and 500 confirmed ORDER_RECEIVED.
// MTN, Airtel, 9mobile codes TBD — fetch from Clubkonnect support or dashboard.
const FALLBACK_PLANS: Record<string, DataPlan[]> = {
    mtn: [
        // MTN codes not yet confirmed — purchases will return INVALID_DATAPLAN
        // until real codes are obtained from Clubkonnect dashboard/support.
        { id: '200', name: '200MB', code: '200', amount: 200,  network: 'MTN', validity: 'SME' },
        { id: '500', name: '500MB', code: '500', amount: 500,  network: 'MTN', validity: 'SME' },
        { id: '1000', name: '1GB',  code: '1000', amount: 1000, network: 'MTN', validity: 'SME' },
    ],
    airtel: [
        { id: '200', name: '200MB', code: '200', amount: 200,  network: 'AIRTEL', validity: 'SME' },
        { id: '500', name: '500MB', code: '500', amount: 500,  network: 'AIRTEL', validity: 'SME' },
        { id: '1000', name: '1GB',  code: '1000', amount: 1000, network: 'AIRTEL', validity: 'SME' },
    ],
    glo: [
        { id: '200', name: '200MB', code: '200', amount: 200,  network: 'GLO', validity: '14 days' },
        { id: '500', name: '500MB', code: '500', amount: 500,  network: 'GLO', validity: '7 days' },
        { id: '1000', name: '1GB',  code: '1000', amount: 1000, network: 'GLO', validity: 'SME' },
        { id: '2000', name: '2GB',  code: '2000', amount: 2000, network: 'GLO', validity: 'SME' },
    ],
    '9mobile': [
        { id: '200', name: '200MB', code: '200', amount: 200,  network: '9MOBILE', validity: 'SME' },
        { id: '500', name: '500MB', code: '500', amount: 500,  network: '9MOBILE', validity: 'SME' },
        { id: '1000', name: '1GB',  code: '1000', amount: 1000, network: '9MOBILE', validity: 'SME' },
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
        const params = {
            ...credentials(),
            MobileNetwork: networkCode(network),
            Amount: amount,
            MobileNumber: phoneNumber,
            RequestID: requestId,
            CallBackURL: '',
        };
        const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
        console.log('CALLING CLUBKONNECT URL:', `${env.CLUBKONNECT_BASE_URL}/APIAirtimeV1.asp?${qs}`);
        console.log('PARAMS:', JSON.stringify({ ...params, APIKey: '***' }));

        const { data } = await client.get('/APIAirtimeV1.asp', { params });

        console.log('CLUBKONNECT RAW RESPONSE:', JSON.stringify(data));

        if (data?.statuscode !== '100') {
            throw new Error(data?.status ?? 'Airtime purchase failed');
        }

        return { success: true, orderId: data.orderid, status: data.status };
    } catch (err: any) {
        const message = err.message ?? 'Airtime purchase failed';
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

        if (data?.statuscode !== '100') {
            throw new Error(data?.status ?? 'Data purchase failed');
        }

        return { success: true, orderId: data.orderid, status: data.status };
    } catch (err: any) {
        const message = err.message ?? 'Data purchase failed';
        console.error('[clubkonnect.purchaseData] error:', message);
        throw new Error(message);
    }
}

export async function getDataPlans(network: string): Promise<DataPlan[]> {
    const code = networkCode(network);
    const networkLabel = network.toUpperCase();

    try {
        const { data } = await client.get('/APIDatabundleNetworkV2.asp', {
            params: {
                UserID: env.CLUBKONNECT_USER_ID,
                APIKey: env.CLUBKONNECT_API_KEY,
                MobileNetwork: code,
            },
        });

        console.log('[clubkonnect.getDataPlans] response:', JSON.stringify(data));

        const raw: any[] = Array.isArray(data) ? data : [];
        if (raw.length === 0) throw new Error('Empty plan list from API');

        return raw.map((p) => ({
            id:       String(p.DataPlan),
            code:     String(p.DataPlan),
            name:     p.DataVolume   ?? p.DataAllowance ?? 'Data Plan',
            validity: p.DataValidity ?? '',
            amount:   parseFloat(p.DataPrice ?? '0'),
            network:  networkLabel,
        }));
    } catch (err: any) {
        console.error('[clubkonnect.getDataPlans] live fetch failed — using fallback:', err.message);
        const key = network.toLowerCase().replace(/\s/g, '');
        return FALLBACK_PLANS[key] ?? [];
    }
}

export async function checkBalance(): Promise<number> {
    try {
        const { data } = await client.get('/APIWalletBalanceV1.asp', {
            params: credentials(),
        });

        console.log('[clubkonnect.checkBalance] response:', JSON.stringify(data));

        const balance = parseFloat(data?.balance ?? '0');
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

        return { success: data?.status === 'ORDER_COMPLETED', data, message: data?.status ?? '' };
    } catch (err: any) {
        const message = err.message ?? 'Transaction query failed';
        console.error('[clubkonnect.queryTransaction] error:', message);
        throw new Error(message);
    }
}
