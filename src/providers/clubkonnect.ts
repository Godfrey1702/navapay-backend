import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
    baseURL: env.CLUBKONNECT_BASE_URL,
    timeout: 30000,
});

// ─── Network code mapping ────────────────────────────────────────────────────
// Confirmed via APIDatabundleNetworkV2.asp response: MTN=01, GLO=02, Etisalat/9mobile=03, Airtel=04

function networkCode(network: string): string {
    const map: Record<string, string> = {
        mtn: '01',
        glo: '02',
        '9mobile': '03',
        etisalat: '03',
        airtel: '04',
    };
    return map[network.toLowerCase()] ?? network;
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

// Plan codes confirmed via live probing against APIDatabundleV1.asp (July 2026).
// Prices are our selling price (marked up from Clubkonnect wholesale cost).
// Airtel codes are estimated — test before relying on them.
const FALLBACK_PLANS: Record<string, DataPlan[]> = {
    mtn: [
        // Confirmed: code 500 → ORDER_RECEIVED "500 MB - Weekly (SME)", wholesale ₦307
        { id: '500',  name: '500MB Weekly',  code: '500',  amount: 350,  network: 'MTN', validity: '7 days' },
        // Confirmed: code 1000 → ORDER_RECEIVED "1 GB - Weekly (SME)", wholesale ₦410
        { id: '1000', name: '1GB Weekly',    code: '1000', amount: 450,  network: 'MTN', validity: '7 days' },
    ],
    glo: [
        // Confirmed: code 200 → ORDER_RECEIVED "200MB 14 days SME", wholesale ₦94
        { id: '200',  name: '200MB',         code: '200',  amount: 100,  network: 'GLO', validity: '14 days' },
        // Confirmed: code 500 → ORDER_RECEIVED "500MB 7 days SME", wholesale ₦230
        { id: '500',  name: '500MB',         code: '500',  amount: 250,  network: 'GLO', validity: '7 days' },
    ],
    '9mobile': [
        // Confirmed: code 500 → ORDER_RECEIVED "500 MB" (Etisalat), wholesale ₦246
        { id: '500',  name: '500MB',         code: '500',  amount: 280,  network: '9MOBILE', validity: '30 days' },
        // Confirmed: code 1000 → ORDER_RECEIVED "1 GB" (Etisalat), wholesale ₦492
        { id: '1000', name: '1GB',           code: '1000', amount: 550,  network: '9MOBILE', validity: '30 days' },
    ],
    airtel: [
        // Estimated — not yet confirmed via live probe. Test before enabling for production.
        { id: '500',  name: '500MB',         code: '500',  amount: 280,  network: 'AIRTEL', validity: '30 days' },
        { id: '1000', name: '1GB',           code: '1000', amount: 450,  network: 'AIRTEL', validity: '30 days' },
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

        const isSuccess = data?.statuscode === '100' || data?.status === 'ORDER_RECEIVED';
        if (!isSuccess) {
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

        // Clubkonnect data endpoint returns statuscode:"" + status:"ORDER_RECEIVED" on success,
        // not statuscode:"100" like the airtime endpoint.
        const isSuccess = data?.statuscode === '100' || data?.status === 'ORDER_RECEIVED';
        if (!isSuccess) {
            throw new Error(data?.status ?? 'Data purchase failed');
        }

        return { success: true, orderId: data.orderid, status: data.status };
    } catch (err: any) {
        const message = err.message ?? 'Data purchase failed';
        console.error('[clubkonnect.purchaseData] error:', message);
        throw new Error(message);
    }
}

// APIDatabundleNetworkV2.asp returns a network discount list, not individual plans.
// No plan-listing endpoint exists on Clubkonnect — serve confirmed fallback plans directly.
export async function getDataPlans(network: string): Promise<DataPlan[]> {
    const key = network.toLowerCase().replace(/\s/g, '');
    return FALLBACK_PLANS[key] ?? [];
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
