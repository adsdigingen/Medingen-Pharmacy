export class PurchaseOrderCreatedEvent {
  constructor(
    public readonly poId: string,
    public readonly poNumber: string,
    public readonly supplierId: string,
    public readonly status: string,
    public readonly itemCount: number,
  ) {}
}

export class PurchaseOrderReceivedEvent {
  constructor(
    public readonly poId: string,
    public readonly poNumber: string,
    public readonly supplierId: string,
    public readonly status: string,
  ) {}
}

export class PurchaseReturnCreatedEvent {
  constructor(
    public readonly returnId: string,
    public readonly poId: string,
    public readonly poNumber: string,
    public readonly supplierId: string,
    public readonly itemCount: number,
  ) {}
}
