export class BillCreatedEvent {
  constructor(
    public readonly billId: string,
    public readonly billNumber: string,
    public readonly invoiceType: string,
    public readonly totalAmount: number,
    public readonly netAmount: number,
  ) {}
}
export class BillCancelledEvent {
  constructor(
    public readonly billId: string,
    public readonly billNumber: string,
    public readonly reason: string,
  ) {}
}
export class SalesReturnEvent {
  constructor(
    public readonly billId: string,
    public readonly billNumber: string,
    public readonly returnedQty: number,
    public readonly itemsReturned: any[],
  ) {}
}
