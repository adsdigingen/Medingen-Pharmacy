export class CustomerCreatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly mobile: string,
  ) {}
}

export class CustomerUpdatedEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly mobile: string,
  ) {}
}
