import { assert, assertEquals, delay, nextTickPromise } from "./test_deps.ts";
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

Deno.test("should not be slow", async () => {
  var s = new Semaphore(3);
  var values = [];

  s.acquire().then((release) => {
    values.push(1);
    release();
  });
  s.acquire().then((release) => {
    values.push(2);
    release();
  });
  s.acquire().then((release) => {
    values.push(3);
    release();
  });
  s.acquire().then((release) => {
    values.push(4);
    release();
  });
  s.acquire().then((release) => {
    values.push(5);
    release();
  });

  await delay(0);
  assertEquals(values.length, 5);
});

Deno.test("should not exceed limit", async () => {
  var s = new Semaphore(3);
  var ran = 0;
  var releaseHandles: (() => void)[] = [];

  // 3 times
  s.acquire().then((release) => {
    ran++;
    releaseHandles.push(release);
  });
  s.acquire().then((release) => {
    ran++;
    releaseHandles.push(release);
  });
  s.acquire().then((release) => {
    ran++;
    releaseHandles.push(release);
  });
  // 2 times
  s.acquire().then(() => {
    ran++;
  });
  s.acquire().then(() => {
    ran++;
  });

  assertEquals(s.length, 5);
  await nextTickPromise();
  assertEquals(ran, 3);
  await nextTickPromise();
  assertEquals(ran, 3);
  assertEquals(s.length, 2);

  releaseHandles.forEach((r) => r());

  await nextTickPromise();
  assertEquals(ran, 5);
  assertEquals(s.length, 0);
});
