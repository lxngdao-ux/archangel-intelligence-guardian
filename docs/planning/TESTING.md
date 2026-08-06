# Guardian Testing Strategy

Source of truth: `ARCHITECTURE.md` Architecture Principle #8 — every investigation is reproducible. Testing exists to enforce that principle, not just to catch bugs.

**Current State:** actual test coverage in the repository was not verified in this session — no code was uploaded. What follows is the target testing strategy; treat it as a gap-check against whatever exists in CI today, not a description of confirmed current coverage.

---

## Why reproducibility is the organizing principle

A Guardian output is a chain: Evidence → Observation → Finding → Hypothesis → Risk Score → Report. If any link in that chain can silently change behavior between releases — a prompt tweak that shifts a score, a weight constant that gets rebalanced without anyone noticing — the platform has quietly broken its own Golden Rule (`ARCHITECTURE.md` §1) without a single line of code looking wrong in review. Testing strategy here is built around making that kind of silent drift loud instead.

## The canonical fixture

**The redacted Investigation File 001 case (Fynor Trading) is the platform's shared regression fixture.** It's real, it's already fully redacted (name, phone, email, password, and ID number stripped — see the case's own documentation), and its expected output is known and documented across `ARCHITECTURE.md` and the Investigation File 001 prototype: 94/100, Pyramid Scheme as the leading supported hypothesis, the specific risk contributor breakdown in `ARCHITECTURE.md` §10.

Using one real, well-understood case consistently — rather than a different synthetic fixture per test — means a reviewer can look at a failing test and immediately know what "wrong" looks like, without first having to understand a new fabricated scenario.

**Rule:** any change to an agent, a prompt, a risk weight, or the scoring logic must run against this fixture before merging. If the fixture's score, hypothesis, or evidence chain changes, that change must be called out explicitly in the pull request description — "this changes Case 001's score from 94 to 91 because X" — not discovered later by someone wondering why a demo looks different.

## Test layers

**1. Agent unit tests.** Each agent (`AI_AGENTS.md`) gets fixture-based tests: known evidence in, assert the shape and content of `AgentFinding[]` out. Specifically assert:
- Every `conclusion`-type finding has at least one `observed` finding backing it (`AI_AGENTS.md` rule 1).
- No `confidenceType` value outside the three allowed strings — this is the test-level enforcement of "never invent a confidence percentage."
- No PII patterns (phone number formats, email formats) present in any `description` or `excerpt` field.

**2. Engine boundary integration tests.** Test each inter-engine contract from `ARCHITECTURE.md` §8 in isolation — e.g., feed `getEvidenceSnapshot()`'s output directly into the Risk Engine and assert the score, without going through the full pipeline. This makes it possible to test the Risk Engine's logic changes without needing every upstream engine to be working correctly at the same time.

**3. End-to-end pipeline test.** Submit the canonical fixture through the full pipeline (Intake → … → Report) and assert the final report matches the documented expected output. This is the test most likely to catch a real regression, and the slowest one — run it on every merge to main, not necessarily on every commit.

**4. Redaction tests.** Explicitly attempt to submit evidence containing realistic-looking PII patterns (test data only, never real PII) and assert that no response — API response, generated report, or log line — contains it. This is the test suite most directly tied to `SECURITY.md`, and should be treated as a release blocker on failure, not a warning.

## What "passing" doesn't mean

A green test suite confirms the pipeline is reproducible and doesn't leak PII. It does not confirm the risk score is *correct* in some absolute sense — Guardian doesn't claim omniscience (`ARCHITECTURE.md` §1, Outstanding Questions principle), and neither should the test suite. Don't write tests that assert "this is definitely a scam" as a boolean; assert the specific, documented evidence and score for the specific, documented fixture.
