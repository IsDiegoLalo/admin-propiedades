import { PAYMENT_MOCK_FAILURE_RATE } from '../config/env';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
}

export interface RefundResult {
  success: boolean;
  refundedAmount: number;
  transactionId?: string;
}

class PaymentGatewayMock {
  async charge(amount: number, currency: string): Promise<PaymentResult> {
    if (Math.random() < PAYMENT_MOCK_FAILURE_RATE) {
      return { success: false, errorCode: 'PAYMENT_DECLINED' };
    }
    return { success: true, transactionId: crypto.randomUUID() };
  }

  async refund(amount: number, transactionId: string): Promise<RefundResult> {
    if (Math.random() < PAYMENT_MOCK_FAILURE_RATE) {
      return { success: false, refundedAmount: 0 };
    }
    return {
      success: true,
      refundedAmount: amount,
      transactionId: crypto.randomUUID(),
    };
  }
}

export const paymentGateway = new PaymentGatewayMock();
