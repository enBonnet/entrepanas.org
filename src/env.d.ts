// Secret bindings are NOT typed by `wrangler types` (only vars/bindings are).
// `cloudflare:workers` `env` is typed as `Cloudflare.Env`, so we augment both
// the global Env and the global Cloudflare namespace. From a module file,
// global augmentation must be wrapped in `declare global`. Values come from
// `.dev.vars` (local) or `wrangler secret put` (prod).
declare global {
  interface Env {
    R2_ACCESS_KEY_ID: string
    R2_SECRET_ACCESS_KEY: string
  }
  namespace Cloudflare {
    interface Env {
      R2_ACCESS_KEY_ID: string
      R2_SECRET_ACCESS_KEY: string
    }
  }
}

export {}
