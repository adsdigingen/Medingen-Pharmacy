export class BatchExpiredEvent {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly batchNumber: string,
    public readonly expiryDate: Date,
  ) {}
}
