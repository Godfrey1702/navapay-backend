import axios from "axios";
import { env } from "../config/env.js";

const payflexClient = axios.create({
  baseURL: env.PAYFLEX_BASE_URL || "https://api.payflex.com.ng/v1",
  headers: {
    Authorization: `Bearer ${env.PAYFLEX_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export interface AirtimeParams {
  phoneNumber: string;
  amount: number;
  network: string;
  reference: string;
}

export interface DataParams {
  phoneNumber: string;
  planId: string;
  network: string;
  reference: string;
}

export async function purchaseAirtime(params: AirtimeParams) {
  try {
    const { data } = await payflexClient.post("/airtime", {
      phone: params.phoneNumber,
      amount: params.amount,
      network: params.network,
      reference: params.reference,
    });
    return { success: true, data };
  } catch (err: any) {
    throw new Error(
      err.response?.data?.message || "Airtime purchase failed"
    );
  }
}

export async function purchaseData(params: DataParams) {
  try {
    const { data } = await payflexClient.post("/data", {
      phone: params.phoneNumber,
      plan_id: params.planId,
      network: params.network,
      reference: params.reference,
    });
    return { success: true, data };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Data purchase failed");
  }
}

export async function getDataPlans(network: string) {
  try {
    const { data } = await payflexClient.get(`/data/plans/${network}`);
    return data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to fetch plans");
  }
}

export async function verifyTransaction(reference: string) {
  try {
    const { data } = await payflexClient.get(`/transactions/${reference}`);
    return data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Verification failed");
  }
}
