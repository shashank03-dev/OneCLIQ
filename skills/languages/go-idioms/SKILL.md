---
name: go-idioms
description: Write idiomatic, production-ready Go - error handling and wrapping, small interfaces, context propagation, safe concurrency, package layout, table-driven tests and tooling (gofmt, go vet, staticcheck, golangci-lint). Use when writing or reviewing Go code, designing a Go package or service, or fixing goroutine leaks, races and error-handling problems.
license: MIT
metadata:
  domain: languages
  author: onecliq
  version: "1.0"
  inspired-by: "samber/cc-skills-golang (golang-error-handling, golang-concurrency, golang-testing, golang-project-layout), Effective Go"
---

# Go idioms

Clear is better than clever. Match the standard library's style.

## Errors

- Return errors as the last value; handle or return every one. Never `_ =` an error without a comment saying why.
- Wrap with context: `return fmt.Errorf("load config %q: %w", path, err)`. Check with `errors.Is` / `errors.As`, never by string.
- Sentinel errors (`var ErrNotFound = errors.New("not found")`) for conditions callers branch on; custom types when they need data.
- Panic only for programmer bugs and impossible states, never for expected failures.
- Error strings: lower case, no trailing punctuation.

## Interfaces and types

- Accept interfaces, return concrete types. Define interfaces where they're **used**, keep them small (1–3 methods).
- Make the zero value useful when you can (`var mu sync.Mutex`, `bytes.Buffer`).
- Pointer receivers when methods mutate or the struct is large; be consistent per type.

## Context

- `ctx context.Context` is the first parameter of anything that does I/O or may block. Never store it in a struct.
- Respect cancellation: pass it to DB/HTTP calls; `select` on `ctx.Done()` in loops.
- Use `context.WithTimeout` at boundaries (incoming request, outbound call).

## Concurrency

- Every goroutine has a clear owner and a way to stop. Use `errgroup.WithContext` for groups that can fail.
- Share memory by communicating, but a `sync.Mutex` is fine and often simpler. Don't copy structs containing mutexes.
- Close channels from the sender only. Bound concurrency (worker pool or semaphore) for fan-out.
- Run tests with `-race` in CI.

## Layout and naming

- `cmd/<app>/main.go` for binaries, `internal/` for non-public packages. Avoid `pkg/` and `util` grab-bags unless the project already uses them.
- Package names: short, lower case, singular, no stutter (`http.Client`, not `http.HTTPClient`).
- Exported identifiers get doc comments starting with the name.

## Tests

Table-driven tests with `t.Run` subtests; `t.Helper()` in helpers; `t.Cleanup` for teardown; `testdata/` for fixtures; `httptest` for HTTP. Benchmarks with `b.Loop()` (Go 1.24+) or `b.N`.

## Tooling

`gofmt`/`goimports`, `go vet`, `staticcheck` or `golangci-lint`, `govulncheck` in CI. `go mod tidy` before committing.
