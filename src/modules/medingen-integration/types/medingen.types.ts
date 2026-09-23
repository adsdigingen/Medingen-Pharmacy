export interface MedingenBillSuccessResponse {
  success: boolean;
  status: 'GENERATED' | 'ALREADY_EXISTS';
  orderId: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  pdfUrl: string | null;
}

export interface MedingenProductNotFoundResponse {
  success: false;
  status: 'PRODUCT_NOT_FOUND';
  orderId: string;
  missingProducts: string[];
}
