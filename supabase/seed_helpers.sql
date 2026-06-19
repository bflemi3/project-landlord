-- =============================================================================
-- LOCAL SEED HELPERS — loaded before seed.sql (see config.toml db.seed.sql_paths).
-- =============================================================================
-- `supabase db reset` runs each seed file as its own pipelined batch, and a
-- batch parses every statement before any executes. A function created inside
-- seed.sql would therefore be invisible to the rows that call it. Defining it
-- here, in a separate file/batch, commits it before seed.sql is parsed.
-- seed.sql drops it at the end so it doesn't linger.
--
-- month_day(months_ago, day_of_month) → day `day_of_month` of the month
-- `months_ago` months before the current one, relative to the run date.
create or replace function public.month_day(months_ago int, day_of_month int)
returns date language sql stable as $$
  select (
    date_trunc('month', current_date)
    - make_interval(months => months_ago)
    + make_interval(days => day_of_month - 1)
  )::date
$$;
