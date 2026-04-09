-- =============================================================================
-- WIPE PRODUCTION DATA FOR brand.fleming@gmail.com + TENANTS
-- =============================================================================
-- This script removes ALL data created by the landlord user and all
-- associated tenant users. It preserves unrelated users (e.g. brandon.fleming@aristotle.ai).
--
-- USAGE:
--   1. Run this SQL in Supabase SQL Editor (as service_role / postgres)
--   2. Then delete storage objects via the Storage API (see bottom of file)
--
-- NOTE: Supabase blocks direct DELETE from storage.objects via SQL.
--       Storage files must be deleted via the REST API (curl command below).
--
-- Safe to re-run — all deletes are idempotent.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_landlord_id uuid := (SELECT id FROM profiles WHERE email = 'brand.fleming@gmail.com');
  v_property_ids uuid[];
  v_unit_ids uuid[];
  v_tenant_ids uuid[];
  v_all_user_ids uuid[];
  v_statement_ids uuid[];
  v_charge_def_ids uuid[];
  v_charge_instance_ids uuid[];
  v_source_doc_paths text[];
BEGIN
  -- Exit early if landlord doesn't exist (already wiped)
  IF v_landlord_id IS NULL THEN
    RAISE NOTICE 'User brand.fleming@gmail.com not found — nothing to wipe.';
    RETURN;
  END IF;

  -- Collect property IDs owned by this landlord
  SELECT array_agg(id) INTO v_property_ids
  FROM properties WHERE created_by = v_landlord_id;
  v_property_ids := COALESCE(v_property_ids, '{}');

  -- Collect unit IDs
  SELECT array_agg(id) INTO v_unit_ids
  FROM units WHERE property_id = ANY(v_property_ids);
  v_unit_ids := COALESCE(v_unit_ids, '{}');

  -- Collect tenant user IDs (exclude the landlord themselves)
  SELECT array_agg(DISTINCT user_id) INTO v_tenant_ids
  FROM memberships
  WHERE property_id = ANY(v_property_ids)
    AND role = 'tenant'
    AND user_id != v_landlord_id;
  v_tenant_ids := COALESCE(v_tenant_ids, '{}');

  -- All user IDs to delete (landlord + tenants)
  v_all_user_ids := array_append(v_tenant_ids, v_landlord_id);

  -- Collect statement IDs
  SELECT array_agg(id) INTO v_statement_ids
  FROM statements WHERE unit_id = ANY(v_unit_ids);
  v_statement_ids := COALESCE(v_statement_ids, '{}');

  -- Collect charge definition IDs
  SELECT array_agg(id) INTO v_charge_def_ids
  FROM charge_definitions WHERE unit_id = ANY(v_unit_ids);
  v_charge_def_ids := COALESCE(v_charge_def_ids, '{}');

  -- Collect charge instance IDs
  SELECT array_agg(id) INTO v_charge_instance_ids
  FROM charge_instances WHERE statement_id = ANY(v_statement_ids);
  v_charge_instance_ids := COALESCE(v_charge_instance_ids, '{}');

  -- Collect source document file paths (for manual storage cleanup)
  SELECT array_agg(file_path) INTO v_source_doc_paths
  FROM source_documents WHERE unit_id = ANY(v_unit_ids);
  v_source_doc_paths := COALESCE(v_source_doc_paths, '{}');

  -- Log what we're about to delete
  RAISE NOTICE '=== WIPE PLAN ===';
  RAISE NOTICE 'Landlord: % (brand.fleming@gmail.com)', v_landlord_id;
  RAISE NOTICE 'Properties: %', COALESCE(array_length(v_property_ids, 1), 0);
  RAISE NOTICE 'Units: %', COALESCE(array_length(v_unit_ids, 1), 0);
  RAISE NOTICE 'Tenants to delete: %', COALESCE(array_length(v_tenant_ids, 1), 0);
  RAISE NOTICE 'Statements: %', COALESCE(array_length(v_statement_ids, 1), 0);
  RAISE NOTICE 'Charge definitions: %', COALESCE(array_length(v_charge_def_ids, 1), 0);
  RAISE NOTICE 'Charge instances: %', COALESCE(array_length(v_charge_instance_ids, 1), 0);
  RAISE NOTICE 'Source doc paths to delete from storage: %', v_source_doc_paths;

  -- -------------------------------------------------------------------------
  -- Leaf data (no dependents)
  -- -------------------------------------------------------------------------
  DELETE FROM disputes WHERE charge_instance_id = ANY(v_charge_instance_ids);
  DELETE FROM tenant_splits WHERE charge_instance_id = ANY(v_charge_instance_ids);
  DELETE FROM payment_events WHERE statement_id = ANY(v_statement_ids);
  DELETE FROM audit_events WHERE actor_id = ANY(v_all_user_ids);
  DELETE FROM notifications WHERE user_id = ANY(v_all_user_ids);

  -- -------------------------------------------------------------------------
  -- Mid-level data
  -- -------------------------------------------------------------------------
  DELETE FROM charge_instances WHERE statement_id = ANY(v_statement_ids);
  DELETE FROM statements WHERE unit_id = ANY(v_unit_ids);
  DELETE FROM source_documents WHERE unit_id = ANY(v_unit_ids);
  DELETE FROM responsibility_allocations WHERE charge_definition_id = ANY(v_charge_def_ids);
  DELETE FROM recurring_rules WHERE charge_definition_id = ANY(v_charge_def_ids);
  DELETE FROM charge_definitions WHERE unit_id = ANY(v_unit_ids);

  -- Invitations: delete all referencing these users OR properties
  -- (includes waitlist/signup invitations with property_id = null)
  DELETE FROM invitations
  WHERE property_id = ANY(v_property_ids)
     OR invited_by = ANY(v_all_user_ids)
     OR accepted_by = ANY(v_all_user_ids);

  DELETE FROM memberships WHERE property_id = ANY(v_property_ids);
  DELETE FROM units WHERE property_id = ANY(v_property_ids);
  DELETE FROM properties WHERE id = ANY(v_property_ids);

  -- -------------------------------------------------------------------------
  -- Users (profiles then auth)
  -- -------------------------------------------------------------------------
  DELETE FROM profiles WHERE id = ANY(v_all_user_ids);
  DELETE FROM auth.users WHERE id = ANY(v_all_user_ids);

  -- Clean up orphaned audit events from cascade delete triggers
  DELETE FROM audit_events WHERE actor_id IS NULL;

  RAISE NOTICE '=== WIPE COMPLETE ===';
  RAISE NOTICE 'Deleted % user(s) (1 landlord + % tenant(s))',
    COALESCE(array_length(v_all_user_ids, 1), 0),
    COALESCE(array_length(v_tenant_ids, 1), 0);
END $$;

COMMIT;

-- =============================================================================
-- STORAGE CLEANUP (run after SQL above)
-- =============================================================================
-- Supabase blocks direct DELETE from storage.objects via SQL.
-- After running the SQL above, delete storage files via the REST API.
--
-- List all objects in source-documents bucket to find paths:
--   curl -s "https://lzxfunlbcpwsfdtditgg.supabase.co/storage/v1/object/list/source-documents" \
--     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--     -H "Content-Type: application/json" \
--     -d '{"prefix":"","limit":100}'
--
-- Delete specific files:
--   curl -s -X DELETE \
--     "https://lzxfunlbcpwsfdtditgg.supabase.co/storage/v1/object/source-documents" \
--     -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
--     -H "Content-Type: application/json" \
--     -d '{"prefixes":["<file_path_1>","<file_path_2>"]}'
--
-- Same pattern for payment-receipts bucket.
-- =============================================================================
