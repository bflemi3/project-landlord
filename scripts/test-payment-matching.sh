#!/usr/bin/env bash
#
# Full local test suite for PRO-61 payment matching.
#
# Sections:
#   1. Pre-flight (docker, supabase CLI, .env.local)
#   2. Vitest — unit + integration (covers RPC, RLS, matcher logic)
#   3. Live webhook auth + routing (no Pluggy needed)
#   4. Live webhook → item events → DB state change
#   5. Live webhook → transactions/created → mock Pluggy → match → ledger flip
#   6. SQL scenarios — idempotent replay, no-match, ambiguous match
#   7. Reversal via JWT spoofing
#   8. Cleanup of synthetic data
#
# Usage:
#   scripts/test-payment-matching.sh [rent_id]
#
# Defaults to the rent we've been using if no arg given. Edit RENT_ID below
# or pass another uuid.
#
set -euo pipefail

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------
RENT_ID="${1:?usage: scripts/test-payment-matching.sh <rent_id>  (seed one with scripts/seed-payment-test.mjs)}"
MOCK_PORT=8787
WEBHOOK_URL="http://127.0.0.1:54321/functions/v1/pluggy-webhook"
DB_CONTAINER="supabase_db_mabenn"
RUN_ID="test-$(date +%s)"
TMP_DIR="$(mktemp -d)"
PIDS=()

# The edge-runtime container must reach the mock Pluggy server on the host.
# Docker Desktop exposes host.docker.internal; native Docker (e.g. WSL2) does
# not, so derive the supabase network's gateway IP (the host as seen from the
# container) and fall back to host.docker.internal. Override with MOCK_HOST=…
if [ -z "${MOCK_HOST:-}" ]; then
  _net=$(docker inspect "$DB_CONTAINER" -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null)
  # Space-separate gateways and take the first — a dual-stack network has both an
  # IPv4 and IPv6 IPAM.Config entry, and we want the IPv4 gateway.
  MOCK_HOST=$(docker network inspect "$_net" -f '{{range .IPAM.Config}}{{.Gateway}} {{end}}' 2>/dev/null | awk '{print $1}')
  MOCK_HOST="${MOCK_HOST:-host.docker.internal}"
fi


# -----------------------------------------------------------------------------
# Output helpers
# -----------------------------------------------------------------------------
c_reset='\033[0m'; c_red='\033[31m'; c_grn='\033[32m'; c_yel='\033[33m'; c_blu='\033[34m'
section() { echo; echo -e "${c_blu}━━ $1 ━━${c_reset}"; }
ok()      { echo -e "  ${c_grn}✓${c_reset} $1"; }
warn()    { echo -e "  ${c_yel}⚠${c_reset} $1"; }
fail()    { echo -e "  ${c_red}✗${c_reset} $1"; exit 1; }
step()    { echo -e "  ${c_blu}·${c_reset} $1"; }

psql_q() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -At "$@"; }
psql_v() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres "$@"; }

cleanup() {
  local exit_code=$?
  echo
  section "Cleanup"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      step "stopping background pid $pid"
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  step "removing synthetic data tagged with $RUN_ID"
  psql_q <<SQL >/dev/null
    delete from payment_matches
     where bank_transaction_id in (
       select id from bank_transactions where pluggy_transaction_id like '${RUN_ID}-%'
     );
    delete from bank_transactions where pluggy_transaction_id like '${RUN_ID}-%';
    -- The section-6 ambiguity test inserts a rent_id-null, kind='rent' duplicate
    -- ledger row on this rent's unit; remove it so re-running against the same
    -- rent doesn't see a phantom second candidate. Scope to kind='rent': a
    -- rent-kind row with no rent_id is only ever this test artifact, whereas
    -- future non-rent obligations (condo/utility) legitimately have rent_id null
    -- and must not be touched.
    delete from monthly_ledger
     where rent_id is null
       and kind = 'rent'
       and unit_id = (select unit_id from rent where id = '$RENT_ID');
SQL
  if [ "$exit_code" = "0" ]; then
    rm -rf "$TMP_DIR"
    ok "cleaned"
  else
    warn "preserved tmp dir for debugging: $TMP_DIR"
    warn "  mock-pluggy.log:  $TMP_DIR/mock-pluggy.log"
    warn "  functions.log:    $TMP_DIR/functions.log"
  fi
}
trap cleanup EXIT

# -----------------------------------------------------------------------------
# 1. Pre-flight
# -----------------------------------------------------------------------------
section "1. Pre-flight"

command -v docker >/dev/null   || fail "docker not in PATH"
command -v supabase >/dev/null || fail "supabase CLI not in PATH"
[ -f .env.local ]              || fail ".env.local missing"
docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$" \
  || fail "supabase db container ($DB_CONTAINER) not running"
ok "docker, supabase CLI, .env.local present"

# Verify the target rent has the shape we need.
read -r RENT_EXISTS LEDGER_OPEN BANK_ACCT < <(psql_q -F' ' <<SQL
select
  (select count(*) from rent where id = '$RENT_ID'),
  (select count(*) from monthly_ledger where rent_id = '$RENT_ID' and status = 'open'),
  (select count(*)
     from bank_accounts ba
     join memberships m on m.user_id = ba.user_id and m.role = 'landlord' and m.deleted_at is null
     join units u on u.property_id = m.property_id
     join rent r on r.unit_id = u.id
     where r.id = '$RENT_ID');
SQL
)
[ "$RENT_EXISTS" = "1" ] || fail "rent $RENT_ID not found"
[ "$LEDGER_OPEN" -gt 0 ] || fail "no open ledger rows for rent — nothing to match"
[ "$BANK_ACCT" -gt 0 ]   || fail "rent has no landlord bank account connected"
ok "rent has $LEDGER_OPEN open ledger rows + landlord bank account"

# Pull canonical IDs for use throughout.
BANK_ACCOUNT_ID=$(psql_q <<SQL
select ba.id from bank_accounts ba
 join memberships m on m.user_id = ba.user_id and m.role = 'landlord' and m.deleted_at is null
 join units u on u.property_id = m.property_id
 join rent r on r.unit_id = u.id
where r.id = '$RENT_ID' limit 1;
SQL
)
PLUGGY_ITEM_ID=$(psql_q <<SQL
select bi.pluggy_item_id from bank_items bi
 join bank_accounts ba on ba.bank_item_id = bi.id
where ba.id = '$BANK_ACCOUNT_ID';
SQL
)
PLUGGY_ACCOUNT_ID=$(psql_q <<SQL
select pluggy_account_id from bank_accounts where id = '$BANK_ACCOUNT_ID';
SQL
)
LANDLORD_ID=$(psql_q <<SQL
select user_id from bank_accounts where id = '$BANK_ACCOUNT_ID';
SQL
)
ok "bank_account=$BANK_ACCOUNT_ID  pluggy_item=$PLUGGY_ITEM_ID  pluggy_account=$PLUGGY_ACCOUNT_ID"

# -----------------------------------------------------------------------------
# 2. Vitest — unit + integration
# -----------------------------------------------------------------------------
section "2. Vitest (matcher unit + integration suites)"

step "unit: src/lib/payments + src/lib/pluggy"
npx vitest run src/lib/payments src/lib/pluggy --silent 2>&1 | tail -5

step "integration: payment-matching.integration.test.ts"
npx vitest run --config vitest.integration.config.ts payment-matching --silent 2>&1 | tail -5

ok "vitest suites passed"

# -----------------------------------------------------------------------------
# 3. Live webhook — auth + routing
# -----------------------------------------------------------------------------
section "3. Live webhook (auth + routing)"

# Start the mock Pluggy server (used in section 5; harmless to run early).
NEXT_OPEN_DUE=$(psql_q <<SQL
select due_date::text from monthly_ledger
 where rent_id = '$RENT_ID' and status = 'open'
 order by due_date limit 1;
SQL
)
NEXT_OPEN_AMOUNT=$(psql_q <<SQL
select amount_minor from monthly_ledger
 where rent_id = '$RENT_ID' and status = 'open'
 order by due_date limit 1;
SQL
)
MOCK_TX_ID="${RUN_ID}-pix-001"
AMOUNT_DECIMAL=$(awk "BEGIN{printf \"%.2f\", $NEXT_OPEN_AMOUNT/100}")
FIXTURE=$(cat <<JSON
[{
  "id": "${MOCK_TX_ID}",
  "accountId": "${PLUGGY_ACCOUNT_ID}",
  "date": "${NEXT_OPEN_DUE}T10:00:00Z",
  "description": "PIX recebido (mock pluggy)",
  "amount": ${AMOUNT_DECIMAL},
  "currencyCode": "BRL",
  "type": "CREDIT"
}]
JSON
)
step "starting mock Pluggy on :$MOCK_PORT (1 fixture tx, $NEXT_OPEN_AMOUNT cents @ $NEXT_OPEN_DUE)"
MOCK_PLUGGY_FIXTURE="$FIXTURE" node scripts/mock-pluggy.mjs $MOCK_PORT \
  > "$TMP_DIR/mock-pluggy.log" 2>&1 &
PIDS+=($!)

# Compose an env file for the function that overrides PLUGGY_BASE_URL.
cp .env.local "$TMP_DIR/.env.functions"
echo "PLUGGY_BASE_URL=http://${MOCK_HOST}:${MOCK_PORT}" >> "$TMP_DIR/.env.functions"

step "starting supabase functions serve pluggy-webhook"
supabase functions serve pluggy-webhook --env-file "$TMP_DIR/.env.functions" --no-verify-jwt \
  > "$TMP_DIR/functions.log" 2>&1 &
PIDS+=($!)

# Wait for the function to be fully compiled and serving. The edge runtime
# returns 503 while still compiling the function on first request, so wait for
# the method-guard's 405 (a GET that actually reached our handler), not just any
# HTTP code — otherwise later sections race a still-warming worker.
for i in {1..30}; do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' -X GET "$WEBHOOK_URL")" = "405" ]; then
    ok "functions runtime up (after ${i}s)"
    break
  fi
  sleep 1
  if [ "$i" = "30" ]; then
    cat "$TMP_DIR/functions.log"
    fail "functions runtime didn't start"
  fi
done

# Load the webhook token from .env.local
WEBHOOK_TOKEN=$(grep -E '^PLUGGY_WEBHOOK_TOKEN=' .env.local | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
[ -n "$WEBHOOK_TOKEN" ] || fail "PLUGGY_WEBHOOK_TOKEN missing from .env.local"

assert_status() {
  local expected="$1"; shift
  local got
  # These checks never legitimately return 502/503 (the handler answers
  # 405/401/400/202); a 5xx here means the edge runtime spun a fresh worker
  # that's still compiling on a cold start, so retry rather than fail.
  for _ in $(seq 1 12); do
    got=$(curl -s -o /dev/null -w '%{http_code}' "$@")
    [ "$got" != "502" ] && [ "$got" != "503" ] && break
    sleep 0.5
  done
  if [ "$got" = "$expected" ]; then ok "$expected — $*"
  else fail "expected $expected, got $got — $*"; fi
}

assert_status 405 -X GET  "$WEBHOOK_URL"
assert_status 401 -X POST -H "Content-Type: application/json" -d '{}' "$WEBHOOK_URL"
assert_status 400 -X POST -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" -d 'not-json' "$WEBHOOK_URL"
assert_status 202 -X POST -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" -d '{"event":"unknown/event"}' "$WEBHOOK_URL"

# -----------------------------------------------------------------------------
# 4. Webhook → item events → bank_items.status changes
# -----------------------------------------------------------------------------
section "4. Webhook → item events"

# Post an idempotent item event and poll bank_items.status until it reaches the
# expected value, re-sending each iteration (up to ~12s). The webhook acks (202)
# before its DB write commits, and an edge-runtime cold worker can drop/slow the
# first request — re-sending the same status-set event is safe and avoids both
# the async-write race and a dropped POST. Echoes the final status.
post_and_wait() {
  local event="$1" want="$2" got=""
  for _ in $(seq 1 24); do
    curl -s -o /dev/null -X POST "$WEBHOOK_URL" \
      -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" \
      -d "{\"event\":\"$event\",\"itemId\":\"$PLUGGY_ITEM_ID\"}"
    sleep 0.5
    got=$(psql_q <<SQL
select status from bank_items where pluggy_item_id = '$PLUGGY_ITEM_ID';
SQL
)
    [ "$got" = "$want" ] && break
  done
  echo "$got"
}

BEFORE_STATUS=$(psql_q <<SQL
select status from bank_items where pluggy_item_id = '$PLUGGY_ITEM_ID';
SQL
)
step "bank_items.status before: $BEFORE_STATUS"

AFTER_ERR=$(post_and_wait item/error reconnect_required)
[ "$AFTER_ERR" = "reconnect_required" ] \
  && ok "item/error → status=reconnect_required" \
  || fail "expected reconnect_required, got $AFTER_ERR"

AFTER_OK=$(post_and_wait item/updated connected)
[ "$AFTER_OK" = "connected" ] \
  && ok "item/updated → status=connected" \
  || fail "expected connected, got $AFTER_OK"

# Restore original status if it was different.
psql_q <<SQL >/dev/null
update bank_items set status = '$BEFORE_STATUS' where pluggy_item_id = '$PLUGGY_ITEM_ID';
SQL
step "restored bank_items.status to original ($BEFORE_STATUS)"

# -----------------------------------------------------------------------------
# 5. Full webhook integration — transactions/created → mock fetch → match
# -----------------------------------------------------------------------------
section "5. Full webhook → mock Pluggy → match"

LEDGER_BEFORE_PAID=$(psql_q <<SQL
select count(*) from monthly_ledger where rent_id = '$RENT_ID' and status = 'paid';
SQL
)
step "monthly_ledger paid count before: $LEDGER_BEFORE_PAID"

curl -s -o /dev/null -X POST "$WEBHOOK_URL" \
  -H "X-Webhook-Token: $WEBHOOK_TOKEN" -H "Content-Type: application/json" \
  -d "$(cat <<JSON
{"event":"transactions/created","itemId":"$PLUGGY_ITEM_ID","accountIds":["$PLUGGY_ACCOUNT_ID"]}
JSON
)"
sleep 2

# Verify our mock saw the fetch
grep -q '/transactions' "$TMP_DIR/mock-pluggy.log" \
  && ok "mock Pluggy received /transactions request" \
  || warn "mock Pluggy did NOT see fetch — check $TMP_DIR/functions.log and MOCK_HOST=$MOCK_HOST"

# Verify the transaction landed in our DB
TX_LANDED=$(psql_q <<SQL
select count(*) from bank_transactions where pluggy_transaction_id = '$MOCK_TX_ID';
SQL
)
[ "$TX_LANDED" = "1" ] \
  && ok "bank_transactions row inserted via webhook" \
  || fail "bank_transactions row NOT found — webhook pipeline broken"

# Verify a match was created
MATCH_COUNT=$(psql_q <<SQL
select count(*) from payment_matches pm
  join bank_transactions bt on bt.id = pm.bank_transaction_id
 where bt.pluggy_transaction_id = '$MOCK_TX_ID' and pm.reversed_at is null;
SQL
)
[ "$MATCH_COUNT" = "1" ] \
  && ok "payment_matches row created for the mock tx" \
  || fail "no active match found"

LEDGER_AFTER_PAID=$(psql_q <<SQL
select count(*) from monthly_ledger where rent_id = '$RENT_ID' and status = 'paid';
SQL
)
[ "$LEDGER_AFTER_PAID" -gt "$LEDGER_BEFORE_PAID" ] \
  && ok "monthly_ledger paid count went $LEDGER_BEFORE_PAID → $LEDGER_AFTER_PAID" \
  || fail "ledger paid count didn't increase ($LEDGER_BEFORE_PAID → $LEDGER_AFTER_PAID)"

# -----------------------------------------------------------------------------
# 6. SQL scenarios — idempotent replay, no-match, ambiguous
# -----------------------------------------------------------------------------
section "6. SQL scenarios"

step "idempotent replay — same pluggy_transaction_id"
REPLAY_RESULT=$(psql_q <<SQL
select apply_pluggy_transaction(
  '$BANK_ACCOUNT_ID',
  jsonb_build_object(
    'id', '$MOCK_TX_ID',
    'date', '${NEXT_OPEN_DUE}T10:00:00Z',
    'amount_minor', $NEXT_OPEN_AMOUNT,
    'currency', 'BRL',
    'description', 'replay'
  )
);
SQL
)
echo "$REPLAY_RESULT" | grep -q '"duplicate"' \
  && ok "replay returned {reason: duplicate}" \
  || fail "replay didn't return duplicate: $REPLAY_RESULT"

step "no-match — credit with an amount no ledger row expects"
NOMATCH_RESULT=$(psql_q <<SQL
select apply_pluggy_transaction(
  '$BANK_ACCOUNT_ID',
  jsonb_build_object(
    'id', '${RUN_ID}-nomatch',
    'date', '${NEXT_OPEN_DUE}T10:00:00Z',
    'amount_minor', 1,
    'currency', 'BRL',
    'description', 'no-match probe'
  )
);
SQL
)
echo "$NOMATCH_RESULT" | grep -q '"matched": false' \
  && ok "no-match returned matched:false (tx still recorded)" \
  || fail "no-match returned unexpected: $NOMATCH_RESULT"

step "ambiguous — two open rows in the same window → record, no match"
# Genuine ambiguity needs two open obligations a single credit could match:
# same amount AND same due_date (so both fall in the ±10-day window). The seeded
# rent has one row per month, so two same-amount rows in DIFFERENT months are NOT
# ambiguous — only one is ever in the window. Duplicate the current first-open
# obligation as a second open ledger row (rent_id null is permitted by the
# partial unique index) on the same unit to create a real in-window pair.
AMBIG_DUE=$(psql_q <<SQL
select due_date::text from monthly_ledger
 where rent_id = '$RENT_ID' and status = 'open'
 order by due_date limit 1;
SQL
)
psql_q <<SQL >/dev/null
insert into monthly_ledger
  (unit_id, rent_id, kind, bill_holder, period_year, period_month,
   due_date, amount_minor, currency, status)
select unit_id, null, 'rent', 'tenant', period_year, period_month,
       due_date, amount_minor, currency, 'open'
  from monthly_ledger
 where rent_id = '$RENT_ID' and status = 'open'
 order by due_date limit 1;
SQL
AMBIG_RESULT=$(psql_q <<SQL
select apply_pluggy_transaction(
  '$BANK_ACCOUNT_ID',
  jsonb_build_object(
    'id', '${RUN_ID}-ambig',
    'date', '${AMBIG_DUE}T10:00:00Z',
    'amount_minor', $NEXT_OPEN_AMOUNT,
    'currency', 'BRL',
    'description', 'ambiguous'
  )
);
SQL
)
echo "$AMBIG_RESULT" | grep -q '"matched": false' \
  && ok "ambiguous (two same-window rows) returned matched:false" \
  || fail "ambiguous returned: $AMBIG_RESULT"

# -----------------------------------------------------------------------------
# 7. Reversal via JWT spoofing
# -----------------------------------------------------------------------------
section "7. Reversal (JWT-spoofed landlord)"

MATCH_ID=$(psql_q <<SQL
select pm.id from payment_matches pm
  join bank_transactions bt on bt.id = pm.bank_transaction_id
 where bt.pluggy_transaction_id = '$MOCK_TX_ID' and pm.reversed_at is null;
SQL
)
[ -n "$MATCH_ID" ] || fail "no active match to reverse"
step "reversing match $MATCH_ID as landlord $LANDLORD_ID"

REVERSAL=$(psql_q <<SQL
begin;
select set_config('request.jwt.claims', json_build_object('sub','$LANDLORD_ID')::text, true);
select unmatch_payment('$MATCH_ID', 'test script reversal');
commit;
SQL
)
echo "$REVERSAL" | grep -q '"success": true' \
  && ok "unmatch_payment returned success" \
  || fail "reversal failed: $REVERSAL"

REVERSED_STATUS=$(psql_q <<SQL
select status from monthly_ledger ml
  join payment_matches pm on pm.monthly_ledger_id = ml.id
 where pm.id = '$MATCH_ID';
SQL
)
[ "$REVERSED_STATUS" = "open" ] \
  && ok "ledger row flipped back to open" \
  || fail "expected open, got $REVERSED_STATUS"

REVERSED_REASON=$(psql_q <<SQL
select reversal_reason from payment_matches where id = '$MATCH_ID';
SQL
)
[ "$REVERSED_REASON" = "test script reversal" ] \
  && ok "reversal_reason persisted" \
  || fail "expected 'test script reversal', got '$REVERSED_REASON'"

echo
echo -e "${c_grn}━━ ALL SECTIONS PASSED ━━${c_reset}"
