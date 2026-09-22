export class StockAdjustedEvent {
  constructor(
    public readonly batchId: string,
    public readonly productId: string,
    public readonly type: string,
    public readonly quantity: number,
    public readonly reason: string,
  ) {}
}
