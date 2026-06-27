# Skill Registry — entrepanas (traza repo)

<!-- Auto-curated by sdd-init. An INDEX, not a summary. Delegators read this to pick skills, then pass exact SKILL.md paths to subagents to load the full runtime contract. -->
<!-- Refresh hint: regenerate via `gentle-ai skill-registry refresh --force` after installing/removing skills. -->

Last updated: 2026-06-26

## Sources scanned

- /home/enbonnet/.config/opencode/skills (canonical for opencode; all skills below resolve here unless noted)
- /home/enbonnet/.claude/skills (fallback mirror)
- /home/enbonnet/.pi/agent/skills (fallback mirror)
- /home/enbonnet/.agents/skills (find-skills only)

## Contract

**Delegator use only.** This registry is an index, not a summary. Any agent that launches subagents reads it to select relevant skills, then passes exact `SKILL.md` paths for the subagent to read before work.

`SKILL.md` remains the source of truth. Do not inject generated summaries or compact rules by default; pass paths so subagents load the full runtime contract and preserve author intent.

### Excluded by convention

`sdd-*` (orchestrator-managed pipeline), `_shared` (support package), `skill-registry` (this index) are intentionally omitted — the SDD orchestrator dispatches them directly.

## Skills

| Skill | Trigger / description | Scope | Path |
| --- | --- | --- | --- |
| `agents-sdk` | Build AI agents on Cloudflare Workers using the Agents SDK. Load when creating stateful agents, durable workflows, real-time WebSocket apps, scheduled tasks, MCP servers, chat applications, voice agents, or browser automation. | user | `/home/enbonnet/.config/opencode/skills/agents-sdk/SKILL.md` |
| `branch-pr` | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | user | `/home/enbonnet/.config/opencode/skills/branch-pr/SKILL.md` |
| `chained-pr` | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | user | `/home/enbonnet/.config/opencode/skills/chained-pr/SKILL.md` |
| `cloudflare` | Comprehensive Cloudflare platform skill covering Workers, Pages, storage (KV, D1, R2), AI, networking, security (WAF, DDoS), and IaC. Use for any Cloudflare development task. | user | `/home/enbonnet/.config/opencode/skills/cloudflare/SKILL.md` |
| `cloudflare-email-service` | Send/receive transactional email with Cloudflare Email Service (Email Sending + Routing). Use for email sending, routing, deliverability (SPF/DKIM/DMARC), or integrating email into Workers/Node/Python/Go. | user | `/home/enbonnet/.config/opencode/skills/cloudflare-email-service/SKILL.md` |
| `cloudflare-one` | Cloudflare One Zero Trust and SASE: Access, Gateway, WARP, Tunnel, WAN, DLP, CASB, device posture, identity. Use when designing/configuring/troubleshooting/reviewing CF One deployments. | user | `/home/enbonnet/.config/opencode/skills/cloudflare-one/SKILL.md` |
| `cloudflare-one-migrations` | Plans migrations from Zscaler, Palo Alto, legacy VPN, SWG, or SASE stacks to Cloudflare One. Use for migration assessments, policy mapping, rollout plans, parity/gap analysis. | user | `/home/enbonnet/.config/opencode/skills/cloudflare-one-migrations/SKILL.md` |
| `cognitive-doc-design` | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | user | `/home/enbonnet/.config/opencode/skills/cognitive-doc-design/SKILL.md` |
| `comment-writer` | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | user | `/home/enbonnet/.config/opencode/skills/comment-writer/SKILL.md` |
| `durable-objects` | Create and review Cloudflare Durable Objects. Use for stateful coordination, RPC methods, SQLite storage, alarms, WebSockets; testing with Vitest. | user | `/home/enbonnet/.config/opencode/skills/durable-objects/SKILL.md` |
| `find-skills` | Helps users discover and install agent skills ("how do I do X", "find a skill for X", "is there a skill that can..."). | user | `/home/enbonnet/.agents/skills/find-skills/SKILL.md` |
| `go-testing` | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | user | `/home/enbonnet/.config/opencode/skills/go-testing/SKILL.md` |
| `issue-creation` | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | user | `/home/enbonnet/.config/opencode/skills/issue-creation/SKILL.md` |
| `judgment-day` | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | user | `/home/enbonnet/.config/opencode/skills/judgment-day/SKILL.md` |
| `playwright-cli` | Automate browser interactions, test web pages and work with Playwright tests. | user | `/home/enbonnet/.claude/skills/playwright-cli/SKILL.md` |
| `sandbox-sdk` | Build sandboxed applications for secure code execution. Use for AI code execution, CI/CD, interactive dev environments, executing untrusted code. | user | `/home/enbonnet/.config/opencode/skills/sandbox-sdk/SKILL.md` |
| `skill-creator` | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | user | `/home/enbonnet/.config/opencode/skills/skill-creator/SKILL.md` |
| `skill-improver` | Trigger: improve/audit/refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | user | `/home/enbonnet/.config/opencode/skills/skill-improver/SKILL.md` |
| `turnstile-spin` | Set up Cloudflare Turnstile end-to-end: scan codebase, create widget, deploy siteverify Worker, write frontend, validate. Use to add CAPTCHA / bot protection. | user | `/home/enbonnet/.config/opencode/skills/turnstile-spin/SKILL.md` |
| `web-perf` | Analyze web performance via Chrome DevTools MCP. Measures Core Web Vitals (LCP, INP, CLS) + FCP/TBT/Speed Index; finds render-blocking, network chains, layout shifts, caching, a11y gaps. | user | `/home/enbonnet/.config/opencode/skills/web-perf/SKILL.md` |
| `work-unit-commits` | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | user | `/home/enbonnet/.config/opencode/skills/work-unit-commits/SKILL.md` |
| `workers-best-practices` | Reviews/authors Cloudflare Workers code against production best practices. Use when writing/reviewing Workers, wrangler.jsonc, or checking anti-patterns. | user | `/home/enbonnet/.config/opencode/skills/workers-best-practices/SKILL.md` |
| `wrangler` | Cloudflare Workers CLI: deploy, develop, manage Workers, KV, R2, D1, Vectorize, Hyperdrive, Workers AI, Queues, Workflows, Pipelines, Secrets Store. Load before running wrangler commands. | user | `/home/enbonnet/.config/opencode/skills/wrangler/SKILL.md` |

## Loading protocol

1. Match task context and target files against the `Trigger / description` column.
2. Pass only the matching `Path` values to the subagent under `## Skills to load before work`.
3. Instruct the subagent to read those exact `SKILL.md` files before reading, writing, reviewing, testing, or creating artifacts.
4. If no matching skill exists, proceed without project skill injection and report `skill_resolution: none`.

## Stack-relevant skills for entrepanas

Quick reference for this repo's stack (Cloudflare Workers + D1/R2 + Drizzle + TanStack Start + Vitest):

- **Cloudflare platform**: cloudflare, wrangler, workers-best-practices, durable-objects, agents-sdk, cloudflare-email-service, turnstile-spin
- **Code review / shipping**: judgment-day, branch-pr, chained-pr, work-unit-commits, issue-creation
- **Docs / comms**: cognitive-doc-design, comment-writer
- **Testing**: go-testing (Go only — N/A here; this repo uses vitest), playwright-cli (E2E via MCP)
- **Perf**: web-perf
