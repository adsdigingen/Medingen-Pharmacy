export class ProductCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly sku: string | null,
    public readonly barcode: string | null,
  ) {}
}

export class ProductUpdatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly sku: string | null,
    public readonly barcode: string | null,
  ) {}
}
