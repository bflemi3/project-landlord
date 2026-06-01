#!/usr/bin/env bash
#
# Creates a local Supabase user, adds them to the engineer_allowlist,
# and marks them as having redeemed their invite so middleware lets them through.
#
# Usage: ./scripts/create-eng-user.sh <email>
# Example: ./scripts/create-eng-user.sh brand.fleming+eng@gmail.com

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
PASSWORD=$(openssl rand -base64 16)

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "SUPABASE_SERVICE_ROLE_KEY is not set."
  echo "  Get the local key:  supabase status -o env | grep SERVICE_ROLE_KEY"
  echo "  Then export it:     export SUPABASE_SERVICE_ROLE_KEY=<key>"
  exit 1
fi

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <email>"
  exit 1
fi

EMAIL="$1"

echo "Creating user: $EMAIL"

# Create the user with email confirmed and has_redeemed_invite set
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"email_confirm\": true,
    \"app_metadata\": { \"has_redeemed_invite\": true }
  }")

USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "Failed to create user. Response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  exit 1
fi

echo "Created user: $USER_ID"

# Add to engineer_allowlist
ALLOWLIST_RESPONSE=$(curl -s -X POST "$SUPABASE_URL/rest/v1/engineer_allowlist" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"email\": \"$EMAIL\"
  }")

if [ -n "$ALLOWLIST_RESPONSE" ]; then
  echo "Warning adding to allowlist:"
  echo "$ALLOWLIST_RESPONSE"
else
  echo "Added to engineer_allowlist"
fi

echo ""
echo "Done! Sign in at http://localhost:3000/auth/sign-in"
echo "  Email:    $EMAIL"
echo "  Password: $PASSWORD"
echo "  Then navigate to /eng"
