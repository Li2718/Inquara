const renewFailuresBeforeRecovery = 3;

export function shouldEnterLeaseRecovery(consecutiveRenewFailures: number): boolean {
  return consecutiveRenewFailures >= renewFailuresBeforeRecovery;
}
