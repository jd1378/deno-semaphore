import { Semaphore } from "./semaphore.ts";

export class Mutex extends Semaphore {
  constructor() {
    super(1);
  }
}
