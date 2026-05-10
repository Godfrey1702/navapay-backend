import axios from "axios";
import { env } from "../config/env.js";

const paystackClient = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export async function initializePayment(params: {
  email: string;
  amount: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await paystackClient.post("/transaction/initialize", {
    email: params.email,
    amount: Math.round(params.amount * 100),
    reference: params.reference,
    callback_url: params.callbackUrl,
    metadata: params.metadata,
  });
  return data.data;
}

export async function verifyPayment(reference: string) {
  const { data } = await paystackClient.get(
    `/transaction/verify/${reference}` 
  );
  return data.data;
}
