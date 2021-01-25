import { nextTick } from "./deps.ts";

export {
  assert,
  assertEquals,
} from "https://deno.land/std@0.84.0/testing/asserts.ts";
export { delay } from "https://deno.land/std@0.84.0/async/delay.ts";

export function nextTickPromise() {
  return new Promise((resolve) => {
    nextTick(() => resolve(true));
  });
}
