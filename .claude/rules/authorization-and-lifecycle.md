# Authorization, Lifecycle, and External Contracts

The three failure classes that produce the most dangerous bugs in this codebase are **not** caught by "does it work?" — they pass the happy path and fail at the boundary. They recur because building toward a goal biases attention to the success case. This rule makes the adversarial questions mandatory, not optional.

Apply this whenever a change touches a **trust boundary** (anything taking a client- or external-supplied id), an **external integration** (Pluggy, Celcoin, Resend, any third-party API or webhook), or **persistence** (a migration, RPC, or query that writes or selects rows). Planning interrogates these up front; implementation and review verify them.

Each section ends with **smells** — patterns that mean "stop and prove this is safe," not "this is wrong."

---

## 1. Trust boundaries & provenance

For every value the code acts on, ask: **who supplied it, and has ownership been verified?**

### Required

- Every client- or external-supplied id (a Pluggy `itemId`, a `rent_id`, a `payment_match_id`) MUST have an **ownership check before use** — not just before the write. "Does this object belong to the caller *at all*?" is a different question from "did I write the row correctly."
- `auth.uid()` scoping proves **the row is written to the caller** — it does NOT prove the caller owns the *external object* the row describes. These are different guarantees. Writing an attacker's bank item under the attacker's own `user_id` is still a breach.
- Bind ownership at **creation** so the verify step has something to check against (e.g. mint external-provider tokens with `clientUserId = user.id`, then verify the returned object's `clientUserId === user.id` on ingest).
- Every `SECURITY DEFINER` function is either (a) `service_role`-only by grant, or (b) performs an explicit membership/ownership check (`is_unit_member` / `is_unit_landlord` or equivalent) as its first executable statement. A `SECURITY DEFINER` function granted to `authenticated` with no internal check is a privilege-escalation hole.

### Anti-examples (real PRO-61 findings)

- A server action fetched a client-supplied Pluggy `itemId` with the app-wide API key and persisted it under `auth.uid()` with no check that the item belonged to the caller → any user could register someone else's bank accounts. The `auth.uid()` write gave **false confidence**.
- `generate_rent_ledger_entries` was `SECURITY DEFINER`, granted to `authenticated`, took an arbitrary `p_rent_id`, and checked no membership → any user could materialize ledger rows on a property they don't belong to.

### Smells

- `.rpc(...)` or a fetch using an id that came from the request body/client, with no ownership check on the path.
- `grant execute ... to authenticated` on a `SECURITY DEFINER` function.
- "It's safe because it writes to `auth.uid()`" as the *entire* security rationale.
- An external object id trusted because the caller is authenticated.

---

## 2. Lifecycle completeness

Code that handles **create / success** and ignores **update / delete / failure / replay** is the single largest source of findings. For every handler, entity, or query, walk the full lifecycle explicitly.

### Required

- **Create / update / delete** — does this handler only insert? What happens when the same object is *updated* (a PENDING transaction settling to a real amount)? When it's *removed* (an account no longer returned on reconnect)? `ON CONFLICT DO NOTHING` silently drops updates — confirm that's intended, or upsert the changed fields.
- **Soft-delete** — `deleted_at`-bearing tables (`rent`, etc.) MUST apply `where deleted_at is null` in **every** query that feeds matching, candidate selection, generation, or backfill. A soft-deleted row that still generates `open` obligations is a phantom the matcher will pay.
- **Failure** — a caught error must do something recoverable: retry, dead-letter, or surface. Incrementing an error counter and continuing, while returning success upstream, drops data silently.
- **Replay / out-of-order** — webhook and event handlers must be idempotent AND tolerate redelivery in the wrong order (guard terminal-status transitions so a stale redelivery can't overwrite a newer state).
- **Erasure** — when laying down FKs, decide the deletion path deliberately. `ON DELETE RESTRICT` on a record that references user data blocks LGPD account deletion (15-day right). Choose nullify-actor-and-retain-audited-row vs. cascade on purpose, not by default.

### Anti-examples (real PRO-61 findings)

- Webhook subscribed to `transactions/updated` but the RPC did `ON CONFLICT DO NOTHING` and short-circuited as `duplicate` → a PENDING transaction settling to its real value never re-matched.
- Reconnect inserted accounts `ON CONFLICT DO NOTHING` → renamed/removed accounts never refreshed; a removed account lingered and kept receiving transactions.
- Ledger generator + backfill ignored `rent.deleted_at` → soft-deleted tenancies got 24 months of matchable `open` obligations.
- `payment_matches` FKs were `ON DELETE RESTRICT` → deleting a profile with any matched payment aborts, blocking account deletion.

### Smells

- `ON CONFLICT ... DO NOTHING` (did you mean to ignore updates?).
- `select ... from <soft-deletable table>` with no `deleted_at` predicate.
- A `catch` block that increments a counter / logs and `continue`s while the caller still reports success.
- A new FK with no deliberate `ON DELETE` decision.
- An event handler that assumes first-delivery, in-order, exactly-once.

---

## 3. External-system contracts

Assumptions about how a third party behaves must be **verified against its docs and a real payload**, and the failure path specified. A confident wrong assertion is worse than a TODO — it propagates into code and into reviewers' trust.

### Required

- Every assumption about a third party (retry semantics, pagination, units, event lifecycle, field presence) MUST cite the actual doc, and the **failure path** must be specified — not just the happy path.
- **Webhook acknowledgement semantics:** returning `2xx` tells the sender delivery *succeeded* — most senders (Pluggy included) will then **not** redeliver. Return `5xx` when a batch had unrecoverable failures so retry is actually triggered. Idempotency makes a retry *safe*; it does not *cause* one.
- **Pagination:** a list endpoint returns one page. Loop pages or pass a bounded window; never assume page 1 is the whole set.
- **Money:** `amount_minor integer + currency text`, never float, never a hardcoded `* 100` (bakes in a 2-decimal assumption against the multi-currency principle). Use a currency-aware conversion. See `data-modeling`.
- **Environment-dependent behavior:** make timezone explicit at any `timestamptz → date` cast (`at time zone 'America/Sao_Paulo'` or UTC, deliberately). Default session TZ is an implicit dependency that shifts date-window boundaries.
- **Capture a real payload first.** Inspect the actual third-party response shape before committing a parsing/matching strategy (`docs/research/pluggy-transaction-shape.md` is the pattern).

### Anti-examples (real PRO-61 findings)

- Plan asserted "Pluggy retries idempotent inserts" and returned `202` on handler failure → the contract was backwards; failed fetches dropped credits permanently with no retry.
- `getTransactions` pulled one page of 200 with no `from` window → first-sync / high-volume accounts silently lost transactions past page 1.
- `amount_minor: Math.round(tx.amount * 100)` → float math + hardcoded 2-decimal assumption on money.

### Smells

- A claim about a third party's behavior with no doc citation.
- `return 202` / `2xx` in a `catch` or after a partial failure.
- A single list fetch with no pagination loop or bounded window.
- `* 100`, `parseFloat`, or float arithmetic anywhere near money.
- `timestamptz::date` with no explicit `at time zone`.

---

## Duplication note (drift is how these regress)

The same logic in N places drifts (3 Pluggy clients, matcher in SQL *and* TS). Where a runtime boundary forces duplication (Deno function can't import the Node client), extract the pure logic into a shared module both import, or add a test asserting the two implementations agree on a shared input set. Two "single source of truth" implementations that can silently disagree are not a single source of truth.
