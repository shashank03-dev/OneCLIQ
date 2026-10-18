import { main } from "./index";

// Exit by setting `process.exitCode` and letting the event loop drain.
// `process.exit()` right after a `fetch()` triggers a libuv assertion on
// Windows with current Node releases (nodejs/node#56645, #58091), which
// replaces the exit code with a fail-fast crash.
main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(err);
    process.exitCode = 1;
  },
);
