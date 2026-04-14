# Future: User-Facing Corrections & Provider Request UI

**Status:** Not yet built — requirements captured for future implementation (Plan 5 or later).

---

## User Correction Flow

When a user corrects an extracted value in the product UI:

1. User sees extracted bill data (amount, due date, etc.) and corrects a value
2. System creates a `provider_requests` record:
   - `source`: `user_correction`
   - `profile_id`: the profile that produced the extraction
   - `provider_id`: the provider the profile belongs to
   - `correction_field`: which field was corrected (e.g., `billing.amountDue`)
   - `correction_original`: the extracted value
   - `correction_value`: the user's corrected value
   - `requested_by`: the user's ID
3. System copies the bill PDF reference into `provider_test_bills` (source: `production_correction`) so it's available in the engineering test case workflow
4. The original bill in the user-facing table is untouched
5. The request appears in the engineering `/eng/requests` queue for review

## User "Provider Doesn't Exist" Flow

When a user uploads a bill during expense charge setup and the provider is not recognized:

1. System attempts identification — no matching provider found
2. User is informed the provider isn't supported yet
3. System creates a `provider_requests` record:
   - `source`: `user_new_provider`
   - `test_bill_id`: the uploaded bill (stored in `provider_test_bills`)
   - `requested_by`: the user's ID
   - `provider_id` / `profile_id`: null (not yet created)
4. The request appears in the engineering `/eng/requests` queue
5. User can check status of their request via the app (RLS allows viewing own requests)

## Notification Requirements

- User receives notification when their request status changes (in-app + email via Resend)
- Key transitions to notify: `pending → in_progress` ("We're working on it"), `testing → complete` ("Your provider is now supported"), `pending → declined` ("We can't support this provider because: [reason]")

## Data Flow

```
User-facing bill table ──copy──→ provider_test_bills
                                      │
                                      ▼
                              provider_requests
                                      │
                                      ▼
                              /eng/requests queue
```
