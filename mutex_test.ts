import { assert } from "https://deno.land/std@0.84.0/testing/asserts.ts";
import { delay } from "https://deno.land/std@0.84.0/async/delay.ts";
import { Mutex } from "./mod.ts";

Deno.test("tasks do not overlap", async () => {
  var m = new Mutex();
  var task1running = false;
  var task2running = false;
  var task1ran = false;
  var task2ran = false;
  await Promise.all([
    m.acquire()
      .then((release) => {
        task1running = true;
        task1ran = true;
        return delay(10)
          .then(() => {
            assert(!task2running);
            task1running = false;
            release();
          });
      }),
    m.acquire()
      .then((release) => {
        assert(!task1running);
        task2running = true;
        task2ran = true;
        return delay(10)
          .then(() => {
            task2running = false;
            release();
          });
      }),
  ])
    .then(() => {
      assert(!task1running);
      assert(!task2running);
      assert(task1ran);
      assert(task2ran);
    })
    .catch();
});
