# All code is strict TypeScript (#19)

**All code is TypeScript, strict, with no `any`; `allowJs` goes off, and only config files a tool requires as JavaScript are allowed, listed in `scripts/js-allowlist.json`** (Shakil, 25 Nov 2026).

- **Why:** the same rule as CT Admin, so one habit covers both projects. `unknown` with narrowing catches what `any` hides.
- The rule is agreed in this PR. The check (`check:no-js`), the allowlist and `allowJs: false` come with the tooling PR, and the lint rule against `any` with the lint PR.
