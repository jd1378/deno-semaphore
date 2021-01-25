import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.84.0/testing/asserts.ts";
import { delay } from "https://deno.land/std@0.84.0/async/delay.ts";
import { Semaphore } from "./mod.ts";

Deno.test("limits concurrency", async function () {
  var s = new Semaphore(2);
  var running = 0;
  var ran = 0;
  var task = async () => {
    var release = await s.acquire();
    assert(running <= 1);
    running++;
    await delay(10);
    assert(running <= 2);
    running--;
    ran++;
    release();
  };
  await Promise.all([1, 2, 3, 4, 5].map((i) => task()));
  assertEquals(ran, 5);
});

Deno.test("limits concurrency (use syntax)", async function () {
  var s = new Semaphore(2);
  var running = 0;
  var ran = 0;
  var task = async () => {
    assert(running <= 1);
    running++;
    await delay(10);
    assert(running <= 2);
    running--;
    ran++;
  };
  await Promise.all([1, 2, 3, 4, 5].map((i) => s.use(task)));
  assertEquals(ran, 5);
});

Deno.test("use recovers from thrown exception", async function () {
  var s = new Semaphore(2);
  var running = 0;
  var ran = 0;
  var erred = 0;
  var task = (i: number) =>
    async () => {
      assert(running <= 1);
      running++;
      await delay(10);
      assert(running <= 2);
      running--;
      if (i === 2) {
        throw new Error("bogus");
      }
      ran++;
    };
  await s.use(task(1));
  try {
    await s.use(task(2));
  } catch (err) {
    erred++;
  }
  await s.use(task(3));
  await s.use(task(4));
  await s.use(task(5));
  assertEquals(ran, 4);
  assertEquals(erred, 1);
  assertEquals(s.count, 2);
});

Deno.test("doing release more than once is noop", async () => {
  let release: () => void;
  const m = new Semaphore(1);
  await m.acquire()
    .then((r) => release = r)
    .then(() => release())
    .then(() => release())
    // should not error
    .catch(() => assert(false));
  // can acquire a new one after it
  await m.acquire()
    .then((r) => {
      r();
      assert(true);
    }).catch(() => assert(false));
});
