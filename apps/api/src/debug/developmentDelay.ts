export type DevelopmentDelay = {
  wait(): Promise<void>;
};

export const developmentDelay: DevelopmentDelay = {
  async wait() {
    return;
  }
};

export function configureDevelopmentDelay(delay: DevelopmentDelay): void {
  developmentDelay.wait = delay.wait;
}
