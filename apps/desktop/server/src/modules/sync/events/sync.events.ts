export class SyncCompletedEvent {
  constructor(
    public readonly successfulCount: number,
    public readonly timestamp: Date,
  ) {}
}

export class SyncFailedEvent {
  constructor(
    public readonly errorMsg: string,
    public readonly timestamp: Date,
  ) {}
}
