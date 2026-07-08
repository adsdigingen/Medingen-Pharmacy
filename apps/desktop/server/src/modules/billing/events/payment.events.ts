export class PaymentCompletedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly billId: string,
    public readonly method: string,
    public readonly amount: number,
  ) {}
}

export class PaymentFailedEvent {
  constructor(
    public readonly billId: string,
    public readonly method: string,
    public readonly amount: number,
    public readonly reason: string,
  ) {}
}
