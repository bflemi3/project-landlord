-- =============================================================================
-- Property creation persistence: create_property RPC.
-- Spec: docs/superpowers/specs/2026-05-08-property-creation-persistence-design.md
--   §RPC Contract.
--
-- Single transactional Postgres function that turns wizard draft state into
-- permanent records. SECURITY DEFINER, set search_path = public, granted to
-- authenticated. Idempotent on properties.id = wizard draftId.
--
-- Tagged exceptions raise with SQLSTATE P0001 (raise_exception); the message
-- is a stable code from the error catalogue (unauthenticated,
-- idempotency_owner_mismatch, expense_bundle_invalid_reference,
-- tax_id_conflict). The server action translates these into the
-- ServerErrorsResponse envelope.
-- =============================================================================

create or replace function public.create_property(
  p_property_id            uuid,
  p_property               jsonb,           -- { name, country_code, property_type, street, number, complement, neighborhood, city, state, postal_code }
  p_unit                   jsonb,           -- { name, currency }
  p_contract               jsonb default null,  -- { mime_type, bytes, original_filename, extension, extraction: { data, language, model, schema_version, raw_text, extracted_at } | null }
  p_rent                   jsonb default null,  -- rent table shape; see spec
  p_tenants                jsonb default null,  -- list of { name, email, tax_id, invite_now, code }
  p_expenses               jsonb default null,  -- list of expense rows; see spec
  p_provider_request_drafts jsonb default null, -- list of provider-request drafts; see spec
  p_tax_id                 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id              uuid := auth.uid();
  v_inserted             integer;
  v_created_by           uuid;
  v_unit_id              uuid;
  v_contract_id          uuid;
  v_storage_path         text;
  v_extension            text;
  v_extraction           jsonb;
  v_rent_id              uuid;
  v_tenant               jsonb;
  v_invitation_id        uuid;
  v_invited_count        integer := 0;
  v_deferred_count       integer := 0;
  v_invitations_to_email uuid[] := array[]::uuid[];
  v_draft                jsonb;
  v_draft_index          integer;
  v_dedupe_id            uuid;
  v_country_code         text;
  v_request_id           uuid;
  v_request_ids          uuid[] := array[]::uuid[];
  v_new_count            integer := 0;
  v_deduped_count        integer := 0;
  v_test_bill_id         uuid;
  v_test_bill_path       text;
  v_bill_uploads         jsonb := '[]'::jsonb;
  v_bill_extension       text;
  v_expense              jsonb;
  v_expense_index        integer;
  v_expense_indices      integer[];
  v_topo_order           integer[];
  v_remaining_count      integer;
  v_progress             boolean;
  v_charge_id            uuid;
  v_charge_ids           uuid[];                -- index-aligned to p_expenses
  v_provider_profile_id  uuid;
  v_provider_request_id  uuid;
  v_bundled_into_idx     integer;
  v_bundled_into_charge_id uuid;
  v_existing_tax_id      text;
  v_tax_id_updated       boolean := false;
  v_replay_payload       jsonb;
  v_property_payload     jsonb;
  v_unit_payload         jsonb;
  v_contract_payload     jsonb;
  v_rent_payload         jsonb;
  v_expenses_summary     jsonb;
  v_property_address     jsonb;
begin
  -- -----------------------------------------------------------------------
  -- 1. Auth gate
  -- -----------------------------------------------------------------------
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = 'P0001';
  end if;

  -- -----------------------------------------------------------------------
  -- 2. Bundle graph validation (before any writes)
  -- -----------------------------------------------------------------------
  if p_expenses is not null and jsonb_typeof(p_expenses) = 'array' then
    for v_expense_index in 0 .. jsonb_array_length(p_expenses) - 1 loop
      v_expense := p_expenses -> v_expense_index;

      -- Self-bundle / out-of-range checks for bundled_into_expense_index
      if v_expense ? 'bundled_into_expense_index'
         and v_expense -> 'bundled_into_expense_index' is not null
         and jsonb_typeof(v_expense -> 'bundled_into_expense_index') = 'number' then
        v_bundled_into_idx := (v_expense ->> 'bundled_into_expense_index')::integer;
        if v_bundled_into_idx = v_expense_index then
          raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
        end if;
        if v_bundled_into_idx < 0 or v_bundled_into_idx >= jsonb_array_length(p_expenses) then
          raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
        end if;
      end if;

      -- Mutual exclusivity: bundled_into_rent excludes other attachments.
      if coalesce((v_expense ->> 'bundled_into_rent')::boolean, false) then
        if (v_expense ->> 'bundled_into_expense_index') is not null
           or (v_expense ->> 'provider_profile_id') is not null
           or (v_expense ->> 'provider_request_draft_index') is not null then
          raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
        end if;
      end if;

      -- Mutual exclusivity: bundled_into_expense_index excludes other attachments.
      if (v_expense ->> 'bundled_into_expense_index') is not null then
        if coalesce((v_expense ->> 'bundled_into_rent')::boolean, false)
           or (v_expense ->> 'provider_profile_id') is not null
           or (v_expense ->> 'provider_request_draft_index') is not null then
          raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
        end if;
      end if;

      -- At-most-one of provider_profile_id / provider_request_draft_index.
      if (v_expense ->> 'provider_profile_id') is not null
         and (v_expense ->> 'provider_request_draft_index') is not null then
        raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
      end if;
    end loop;

    -- Cycle detection via Kahn-style topological sort. Track which nodes
    -- still need to be ordered. Each pass strips nodes whose dependency is
    -- already ordered. If a pass makes no progress with nodes remaining,
    -- there is a cycle.
    v_charge_ids := array_fill(null::uuid, array[jsonb_array_length(p_expenses)]);
    v_topo_order := array[]::integer[];
    v_expense_indices := array(select generate_series(0, jsonb_array_length(p_expenses) - 1));
    v_remaining_count := array_length(v_expense_indices, 1);

    while v_remaining_count > 0 loop
      v_progress := false;
      for i in 1 .. coalesce(array_length(v_expense_indices, 1), 0) loop
        v_expense_index := v_expense_indices[i];
        if v_expense_index is null then
          continue;
        end if;
        v_expense := p_expenses -> v_expense_index;

        if (v_expense ->> 'bundled_into_expense_index') is null
           or (v_expense ->> 'bundled_into_expense_index')::integer = any(v_topo_order) then
          v_topo_order := v_topo_order || v_expense_index;
          v_expense_indices[i] := null;
          v_remaining_count := v_remaining_count - 1;
          v_progress := true;
        end if;
      end loop;

      if not v_progress then
        raise exception 'expense_bundle_invalid_reference' using errcode = 'P0001';
      end if;
    end loop;
  end if;

  -- -----------------------------------------------------------------------
  -- 3. Idempotent property insert. Concurrent-safe via ON CONFLICT DO NOTHING.
  -- -----------------------------------------------------------------------
  v_property_address := p_property;
  v_country_code := coalesce(p_property ->> 'country_code', 'BR');

  insert into properties (
    id, name, country_code, property_type,
    street, number, complement, neighborhood, city, state, postal_code,
    created_by
  )
  values (
    p_property_id,
    p_property ->> 'name',
    v_country_code,
    nullif(p_property ->> 'property_type', '')::property_type,
    p_property ->> 'street',
    p_property ->> 'number',
    p_property ->> 'complement',
    p_property ->> 'neighborhood',
    p_property ->> 'city',
    p_property ->> 'state',
    p_property ->> 'postal_code',
    v_user_id
  )
  on conflict (id) do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    -- Row already existed. Confirm ownership and assemble replay payload.
    select created_by into v_created_by from properties where id = p_property_id;
    if v_created_by is null then
      -- Deleted between our insert and select; treat as ownership mismatch.
      raise exception 'idempotency_owner_mismatch' using errcode = 'P0001';
    end if;
    if v_created_by <> v_user_id then
      raise exception 'idempotency_owner_mismatch' using errcode = 'P0001';
    end if;

    -- Replay payload assembly. Per spec, new_count and deduped_count are
    -- not derivable on replay (we can't tell which provider_requests rows
    -- the original insert created vs linked to). tax_id_updated is always
    -- false on replay (decision is not preserved).
    select to_jsonb(p) into v_property_payload
    from (
      select
        id, name, property_type,
        jsonb_build_object(
          'street', street,
          'number', number,
          'complement', complement,
          'neighborhood', neighborhood,
          'city', city,
          'state', state,
          'postal_code', postal_code,
          'country_code', country_code
        ) as address
      from properties where id = p_property_id
    ) p;

    select to_jsonb(u) into v_unit_payload
    from (
      select id, currency from units where property_id = p_property_id limit 1
    ) u;

    select v_unit_payload ->> 'id' into v_unit_id;

    -- Contract on replay: route through units join.
    select to_jsonb(c) into v_contract_payload
    from (
      select
        c.id as contract_id,
        c.storage_path,
        c.original_filename,
        c.upload_status
      from contracts c
      join units u on u.id = c.unit_id
      where u.property_id = p_property_id
        and c.is_active = true
        and c.deleted_at is null
      limit 1
    ) c;

    -- Rent on replay: route through units join.
    select to_jsonb(r) into v_rent_payload
    from (
      select
        r.id as rent_id,
        r.amount_minor,
        r.currency,
        r.due_day_of_month,
        r.includes
      from rent r
      join units u on u.id = r.unit_id
      where u.property_id = p_property_id
        and r.deleted_at is null
      limit 1
    ) r;

    -- Tenant counts.
    select
      count(*) filter (where status = 'pending'),
      count(*) filter (where status = 'not_invited')
    into v_invited_count, v_deferred_count
    from invitations
    where property_id = p_property_id;

    -- invitations_to_email: pending and either never emailed or emailed >5 min ago.
    v_invitations_to_email := array(
      select id
      from invitations
      where property_id = p_property_id
        and status = 'pending'
        and (last_emailed_at is null or last_emailed_at < now() - interval '5 minutes')
    );

    -- Expenses summary, joined through units.
    select jsonb_build_object(
      'count',             coalesce(sum(1), 0),
      'unspecified_count', coalesce(sum(case when cd.provider_profile_id is null and cd.provider_request_id is null and not cd.bundled_into_rent and cd.bundled_into_charge_id is null then 1 else 0 end), 0),
      'bundled_count',     coalesce(sum(case when cd.bundled_into_rent or cd.bundled_into_charge_id is not null then 1 else 0 end), 0),
      'by_type',           coalesce(jsonb_object_agg(et, et_count) filter (where et is not null), '{}'::jsonb)
    ) into v_expenses_summary
    from (
      select
        cd.expense_type,
        cd.provider_profile_id,
        cd.provider_request_id,
        cd.bundled_into_rent,
        cd.bundled_into_charge_id
      from charge_definitions cd
      join units u on u.id = cd.unit_id
      where u.property_id = p_property_id
        and cd.deleted_at is null
    ) cd
    left join lateral (
      select
        cd.expense_type::text as et,
        count(*) over (partition by cd.expense_type)::integer as et_count
    ) t on true;

    -- Bill uploads still pending.
    select coalesce(jsonb_agg(jsonb_build_object(
      'test_bill_id',  ptb.id,
      'storage_path',  ptb.storage_path,
      'mime_type',     ptb.mime_type
    )), '[]'::jsonb)
    into v_bill_uploads
    from provider_test_bills ptb
    where ptb.upload_status = 'pending'
      and ptb.uploaded_by = v_user_id
      and ptb.provider_request_id in (
        select cd.provider_request_id
        from charge_definitions cd
        join units u on u.id = cd.unit_id
        where u.property_id = p_property_id
          and cd.provider_request_id is not null
      );

    return jsonb_build_object(
      'is_idempotent_replay', true,
      'property_id',          p_property_id,
      'property_name',        v_property_payload ->> 'name',
      'property_address',     v_property_payload -> 'address',
      'property_type',        v_property_payload -> 'property_type',
      'unit_id',              v_unit_id,
      'contract',             v_contract_payload,
      'rent',                 v_rent_payload,
      'tenants', jsonb_build_object(
        'invited_count',         v_invited_count,
        'deferred_count',        v_deferred_count,
        'invitations_to_email',  to_jsonb(v_invitations_to_email)
      ),
      'expenses',             coalesce(v_expenses_summary, jsonb_build_object('count', 0, 'unspecified_count', 0, 'bundled_count', 0, 'by_type', '{}'::jsonb)),
      'provider_requests', jsonb_build_object(
        'new_count',     null::integer,
        'deduped_count', null::integer,
        'bill_uploads',  v_bill_uploads
      ),
      'tax_id_updated', false
    );
  end if;

  -- -----------------------------------------------------------------------
  -- 4. Insert unit
  -- -----------------------------------------------------------------------
  insert into units (property_id, name, currency)
  values (
    p_property_id,
    coalesce(p_unit ->> 'name', p_property ->> 'name'),
    coalesce(p_unit ->> 'currency', 'BRL')
  )
  returning id into v_unit_id;

  -- -----------------------------------------------------------------------
  -- 5. Insert landlord membership.
  --    Convention: landlord memberships have unit_id = null (scoped to the
  --    property). is_unit_landlord(unit) joins through units to find a
  --    landlord membership on the unit's property.
  -- -----------------------------------------------------------------------
  insert into memberships (user_id, property_id, unit_id, role)
  values (v_user_id, p_property_id, null, 'landlord');

  -- -----------------------------------------------------------------------
  -- 6. Contract row (when present)
  -- -----------------------------------------------------------------------
  if p_contract is not null then
    v_contract_id := gen_random_uuid();
    v_extension := lower(p_contract ->> 'extension');
    v_storage_path := v_unit_id::text || '/' || v_contract_id::text || '.' || v_extension;
    v_extraction := p_contract -> 'extraction';

    insert into contracts (
      id, unit_id, storage_path, mime_type, bytes, original_filename,
      upload_status, is_active,
      extraction_data, extraction_language, extraction_model,
      extraction_schema_version, extracted_at, raw_text,
      uploaded_by
    )
    values (
      v_contract_id,
      v_unit_id,
      v_storage_path,
      p_contract ->> 'mime_type',
      nullif(p_contract ->> 'bytes', '')::integer,
      p_contract ->> 'original_filename',
      'pending',
      true,
      v_extraction -> 'data',
      v_extraction ->> 'language',
      v_extraction ->> 'model',
      coalesce(nullif(v_extraction ->> 'schema_version', '')::smallint, 0),
      nullif(v_extraction ->> 'extracted_at', '')::timestamptz,
      v_extraction ->> 'raw_text',
      v_user_id
    );
  end if;

  -- -----------------------------------------------------------------------
  -- 7. Rent row (when present)
  -- -----------------------------------------------------------------------
  if p_rent is not null then
    insert into rent (
      unit_id, amount_minor, currency, due_day_of_month,
      start_date, end_date,
      adjustment_frequency, adjustment_method, adjustment_index,
      adjustment_amount_minor, adjustment_basis_points,
      includes,
      created_by
    )
    values (
      v_unit_id,
      (p_rent ->> 'amount_minor')::integer,
      p_rent ->> 'currency',
      (p_rent ->> 'due_day_of_month')::integer,
      nullif(p_rent ->> 'start_date', '')::date,
      nullif(p_rent ->> 'end_date', '')::date,
      p_rent ->> 'adjustment_frequency',
      p_rent ->> 'adjustment_method',
      p_rent ->> 'adjustment_index',
      nullif(p_rent ->> 'adjustment_amount_minor', '')::integer,
      nullif(p_rent ->> 'adjustment_basis_points', '')::integer,
      case
        when p_rent ? 'includes' and jsonb_typeof(p_rent -> 'includes') = 'array'
        then array(select jsonb_array_elements_text(p_rent -> 'includes'))::expense_type[]
        else null
      end,
      v_user_id
    )
    returning id into v_rent_id;
  end if;

  -- -----------------------------------------------------------------------
  -- 8. Tenant invitations
  -- -----------------------------------------------------------------------
  if p_tenants is not null and jsonb_typeof(p_tenants) = 'array' then
    for v_tenant in select jsonb_array_elements(p_tenants) loop
      insert into invitations (
        property_id, unit_id, invited_by, invited_email, invited_name,
        tax_id, role, status, source, code, expires_at, last_emailed_at
      )
      values (
        p_property_id,
        v_unit_id,
        v_user_id,
        v_tenant ->> 'email',
        v_tenant ->> 'name',
        nullif(v_tenant ->> 'tax_id', ''),
        'tenant',
        case when coalesce((v_tenant ->> 'invite_now')::boolean, false)
             then 'pending'::invitation_status
             else 'not_invited'::invitation_status
        end,
        'wizard',
        v_tenant ->> 'code',
        now() + interval '30 days',
        null
      )
      returning id into v_invitation_id;

      if coalesce((v_tenant ->> 'invite_now')::boolean, false) then
        v_invited_count := v_invited_count + 1;
        v_invitations_to_email := v_invitations_to_email || v_invitation_id;
      else
        v_deferred_count := v_deferred_count + 1;
      end if;
    end loop;
  end if;

  -- -----------------------------------------------------------------------
  -- 9. Provider request resolution and dedupe
  -- -----------------------------------------------------------------------
  if p_provider_request_drafts is not null and jsonb_typeof(p_provider_request_drafts) = 'array' then
    v_request_ids := array_fill(null::uuid, array[jsonb_array_length(p_provider_request_drafts)]);

    for v_draft_index in 0 .. jsonb_array_length(p_provider_request_drafts) - 1 loop
      v_draft := p_provider_request_drafts -> v_draft_index;
      v_dedupe_id := null;

      -- Match priority 1: tax id.
      if nullif(v_draft ->> 'requested_provider_tax_id', '') is not null then
        select id into v_dedupe_id
        from provider_requests
        where country_code = v_country_code
          and requested_provider_tax_id = v_draft ->> 'requested_provider_tax_id'
          and status not in ('declined', 'complete')
        order by created_at
        limit 1;
      end if;

      -- Match priority 2: provider id + region.
      if v_dedupe_id is null and nullif(v_draft ->> 'provider_id', '') is not null then
        select id into v_dedupe_id
        from provider_requests
        where country_code = v_country_code
          and provider_id = (v_draft ->> 'provider_id')::uuid
          and expense_type is not distinct from nullif(v_draft ->> 'expense_type', '')::expense_type
          and state is not distinct from nullif(v_draft ->> 'state', '')
          and city is not distinct from nullif(v_draft ->> 'city', '')
          and status not in ('declined', 'complete')
        order by created_at
        limit 1;
      end if;

      -- Match priority 3: normalized name + region.
      if v_dedupe_id is null and nullif(v_draft ->> 'requested_provider_name', '') is not null then
        select id into v_dedupe_id
        from provider_requests
        where country_code = v_country_code
          and normalized_provider_name = public.normalize_provider_name(v_draft ->> 'requested_provider_name')
          and expense_type is not distinct from nullif(v_draft ->> 'expense_type', '')::expense_type
          and state is not distinct from nullif(v_draft ->> 'state', '')
          and city is not distinct from nullif(v_draft ->> 'city', '')
          and status not in ('declined', 'complete')
        order by created_at
        limit 1;
      end if;

      if v_dedupe_id is not null then
        v_request_ids[v_draft_index + 1] := v_dedupe_id;
        v_deduped_count := v_deduped_count + 1;
      else
        insert into provider_requests (
          source, status,
          requested_provider_name, requested_provider_tax_id,
          expense_type, country_code, state, city, neighborhood,
          provider_id, requested_by
        )
        values (
          'user_new_provider', 'pending',
          v_draft ->> 'requested_provider_name',
          nullif(v_draft ->> 'requested_provider_tax_id', ''),
          nullif(v_draft ->> 'expense_type', '')::expense_type,
          v_country_code,
          nullif(v_draft ->> 'state', ''),
          nullif(v_draft ->> 'city', ''),
          nullif(v_draft ->> 'neighborhood', ''),
          nullif(v_draft ->> 'provider_id', '')::uuid,
          v_user_id
        )
        returning id into v_request_id;

        v_request_ids[v_draft_index + 1] := v_request_id;
        v_new_count := v_new_count + 1;
      end if;

      -- Insert provider_test_bills row when the draft has a bill file.
      if v_draft -> 'bill_file' is not null and jsonb_typeof(v_draft -> 'bill_file') = 'object' then
        v_test_bill_id := gen_random_uuid();
        v_bill_extension := lower(v_draft -> 'bill_file' ->> 'extension');
        v_test_bill_path := v_request_ids[v_draft_index + 1]::text || '/' || v_test_bill_id::text || '.' || v_bill_extension;

        insert into provider_test_bills (
          id, provider_request_id, source, storage_path, file_name,
          mime_type, file_size_bytes, uploaded_by, upload_status
        )
        values (
          v_test_bill_id,
          v_request_ids[v_draft_index + 1],
          'provider_request',
          v_test_bill_path,
          v_draft -> 'bill_file' ->> 'original_filename',
          v_draft -> 'bill_file' ->> 'mime_type',
          nullif(v_draft -> 'bill_file' ->> 'bytes', '')::integer,
          v_user_id,
          'pending'
        );

        v_bill_uploads := v_bill_uploads || jsonb_build_object(
          'test_bill_id',  v_test_bill_id,
          'storage_path',  v_test_bill_path,
          'mime_type',     v_draft -> 'bill_file' ->> 'mime_type'
        );
      end if;
    end loop;
  end if;

  -- -----------------------------------------------------------------------
  -- 10. Expenses (charge_definitions). Insert in topological order.
  -- -----------------------------------------------------------------------
  if p_expenses is not null and jsonb_typeof(p_expenses) = 'array' then
    for i in 1 .. coalesce(array_length(v_topo_order, 1), 0) loop
      v_expense_index := v_topo_order[i];
      v_expense := p_expenses -> v_expense_index;

      v_provider_profile_id := nullif(v_expense ->> 'provider_profile_id', '')::uuid;
      v_provider_request_id := null;

      if (v_expense ->> 'provider_request_draft_index') is not null then
        v_provider_request_id := v_request_ids[(v_expense ->> 'provider_request_draft_index')::integer + 1];
      end if;

      v_bundled_into_charge_id := null;
      if (v_expense ->> 'bundled_into_expense_index') is not null then
        v_bundled_into_charge_id := v_charge_ids[(v_expense ->> 'bundled_into_expense_index')::integer + 1];
      end if;

      insert into charge_definitions (
        unit_id, name, expense_type, amount_behavior,
        amount_minor, currency,
        provider_profile_id, provider_request_id,
        bundled_into_rent, bundled_into_charge_id
      )
      values (
        v_unit_id,
        v_expense ->> 'name',
        (v_expense ->> 'expense_type')::expense_type,
        coalesce((v_expense ->> 'amount_behavior')::expense_amount_behavior, 'unknown'),
        nullif(v_expense ->> 'amount_minor', '')::integer,
        coalesce(v_expense ->> 'currency', coalesce(p_unit ->> 'currency', 'BRL')),
        v_provider_profile_id,
        v_provider_request_id,
        coalesce((v_expense ->> 'bundled_into_rent')::boolean, false),
        v_bundled_into_charge_id
      )
      returning id into v_charge_id;

      v_charge_ids[v_expense_index + 1] := v_charge_id;
    end loop;
  end if;

  -- -----------------------------------------------------------------------
  -- 11. Tax id update logic
  -- -----------------------------------------------------------------------
  select tax_id into v_existing_tax_id from profiles where id = v_user_id;

  if (v_existing_tax_id is null or v_existing_tax_id = '')
     and nullif(p_tax_id, '') is not null then
    begin
      update profiles set tax_id = p_tax_id where id = v_user_id;
      v_tax_id_updated := true;
    exception
      when unique_violation then
        raise exception 'tax_id_conflict' using errcode = 'P0001';
    end;
  end if;

  -- -----------------------------------------------------------------------
  -- 12. Build expenses summary for the success payload (first-write path).
  -- -----------------------------------------------------------------------
  select jsonb_build_object(
    'count',             coalesce(sum(1), 0),
    'unspecified_count', coalesce(sum(case when cd.provider_profile_id is null and cd.provider_request_id is null and not cd.bundled_into_rent and cd.bundled_into_charge_id is null then 1 else 0 end), 0),
    'bundled_count',     coalesce(sum(case when cd.bundled_into_rent or cd.bundled_into_charge_id is not null then 1 else 0 end), 0),
    'by_type',           coalesce((select jsonb_object_agg(t.expense_type::text, t.cnt)
                                   from (
                                     select expense_type, count(*) as cnt
                                     from charge_definitions cd2
                                     join units u2 on u2.id = cd2.unit_id
                                     where u2.property_id = p_property_id
                                       and cd2.deleted_at is null
                                     group by expense_type
                                   ) t), '{}'::jsonb)
  )
  into v_expenses_summary
  from charge_definitions cd
  join units u on u.id = cd.unit_id
  where u.property_id = p_property_id
    and cd.deleted_at is null;

  -- -----------------------------------------------------------------------
  -- 13. Return success payload
  -- -----------------------------------------------------------------------
  return jsonb_build_object(
    'is_idempotent_replay', false,
    'property_id',          p_property_id,
    'property_name',        p_property ->> 'name',
    'property_address',     jsonb_build_object(
      'street',       p_property ->> 'street',
      'number',       p_property ->> 'number',
      'complement',   p_property ->> 'complement',
      'neighborhood', p_property ->> 'neighborhood',
      'city',         p_property ->> 'city',
      'state',        p_property ->> 'state',
      'postal_code',  p_property ->> 'postal_code',
      'country_code', v_country_code
    ),
    'property_type',        p_property -> 'property_type',
    'unit_id',              v_unit_id,
    'contract', case when v_contract_id is null then null else
      jsonb_build_object(
        'contract_id',       v_contract_id,
        'storage_path',      v_storage_path,
        'original_filename', p_contract ->> 'original_filename',
        'upload_status',     'pending'
      )
    end,
    'rent', case when v_rent_id is null then null else
      jsonb_build_object(
        'rent_id',          v_rent_id,
        'amount_minor',     (p_rent ->> 'amount_minor')::integer,
        'currency',         p_rent ->> 'currency',
        'due_day_of_month', (p_rent ->> 'due_day_of_month')::integer,
        'includes',         coalesce(p_rent -> 'includes', '[]'::jsonb)
      )
    end,
    'tenants', jsonb_build_object(
      'invited_count',         v_invited_count,
      'deferred_count',        v_deferred_count,
      'invitations_to_email',  to_jsonb(v_invitations_to_email)
    ),
    'expenses',             coalesce(v_expenses_summary, jsonb_build_object('count', 0, 'unspecified_count', 0, 'bundled_count', 0, 'by_type', '{}'::jsonb)),
    'provider_requests', jsonb_build_object(
      'new_count',     v_new_count,
      'deduped_count', v_deduped_count,
      'bill_uploads',  v_bill_uploads
    ),
    'tax_id_updated', v_tax_id_updated
  );
end;
$$;

grant execute on function public.create_property(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text
) to authenticated;

comment on function public.create_property(
  uuid, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, text
) is
  'Atomic property creation. Inserts properties + units + memberships, '
  'optionally contracts + rent + invitations + provider_requests + '
  'provider_test_bills + charge_definitions, optionally updates profiles.tax_id. '
  'Idempotent on properties.id (= wizard draftId). See spec '
  '2026-05-08-property-creation-persistence-design.md §RPC Contract.';
