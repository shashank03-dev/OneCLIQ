---
name: typescript-type-design
description: Design TypeScript types that catch bugs at compile time without becoming unreadable - discriminated unions, narrowing, branded types, generics with constraints, satisfies, runtime validation at boundaries and strict compiler settings. Use when modelling data or state in TypeScript, fixing "any" or type errors, writing reusable generic utilities, or reviewing TS code for type safety.
license: MIT
metadata:
  domain: languages
  author: onecliq
  version: "1.0"
  inspired-by: "wshobson/agents (typescript-advanced-types), mattpocock/skills, typesafe-ai/skills"
---

# TypeScript type design

Types should make wrong states impossible to write and right code easy to read.

## Compiler settings

`"strict": true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` (if the codebase can take it), `noImplicitOverride`. Treat `any` as a bug; use `unknown` and narrow.

## Model states as unions

```ts
// Instead of { loading: boolean; data?: User; error?: string }
type Load<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

function render(s: Load<User>) {
  switch (s.status) {
    case "ok": return s.data.name;      // data is known to exist here
    case "error": return s.error;
    case "idle": case "loading": return null;
    default: return assertNever(s);     // compile error if a case is added and not handled
  }
}
const assertNever = (x: never): never => { throw new Error(`Unhandled: ${JSON.stringify(x)}`); };
```

## Validate at the boundary, trust inside

Data from HTTP, files, env, `JSON.parse` and LLMs is `unknown`. Parse it once with a schema (zod, valibot) and derive the type from the schema:

```ts
const User = z.object({ id: z.string(), email: z.email() });
type User = z.infer<typeof User>;
```

Never `as User` on external data.

## Useful tools

| Need | Tool |
| --- | --- |
| Check a literal matches a type but keep its narrow type | `const routes = {...} satisfies Record<string, Route>` |
| IDs that can't be mixed up | Branded types: `type UserId = string & { readonly __brand: "UserId" }` |
| Constants as types | `as const` + `typeof X[number]` |
| Derive instead of duplicate | `Pick`, `Omit`, `Partial`, `ReturnType`, `Parameters`, indexed access `T["field"]` |
| Generic that needs a shape | `<T extends { id: string }>` |
| Exhaustive object keys | `Record<Union, Value>` |

## Readability rules

- Prefer simple, named types over clever conditional/mapped types. If a type needs a comment to explain it, consider a simpler design.
- Let inference work for locals; annotate exported function parameters and return types.
- Avoid enums (prefer union string literals) and optional-everything interfaces.
- Avoid non-null assertions (`!`); narrow instead.
- Overloads only when the return type genuinely depends on argument shape.

## Done when

`tsc --noEmit` passes under strict settings with no new `any`, `as` casts on external data, or `@ts-ignore` (use `@ts-expect-error` with a reason if unavoidable).
