-- ============================================================================
-- Rename plan_type enum to match official EFRAG VSME standard — Migration 19
-- vsme_lite  → vsme_basic        (EFRAG VSME Basic Module B1–B11)
-- vsme_full  → vsme_comprehensive (EFRAG VSME Comprehensive Module C1–C9)
-- csrd_full  → csrd              (unchanged logic, shorter name)
-- ============================================================================

-- Step 1: Create new enum type
DO $$ BEGIN
  CREATE TYPE plan_type_v2 AS ENUM ('vsme_basic', 'vsme_comprehensive', 'csrd');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Update feature_flag_subscriptions — add tmp column, migrate, swap
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_flag_subscriptions' AND column_name = 'plan_type') THEN

    ALTER TABLE public.feature_flag_subscriptions
      ADD COLUMN IF NOT EXISTS plan_type_v2_tmp plan_type_v2;

    UPDATE public.feature_flag_subscriptions
      SET plan_type_v2_tmp = CASE
        WHEN plan_type::text = 'vsme_lite' THEN 'vsme_basic'::plan_type_v2
        WHEN plan_type::text = 'vsme_full' THEN 'vsme_comprehensive'::plan_type_v2
        WHEN plan_type::text = 'csrd_full' THEN 'csrd'::plan_type_v2
        WHEN plan_type::text = 'basic' THEN 'vsme_basic'::plan_type_v2
        WHEN plan_type::text = 'comprehensive' THEN 'vsme_comprehensive'::plan_type_v2
        ELSE 'vsme_basic'::plan_type_v2
      END;

    ALTER TABLE public.feature_flag_subscriptions DROP COLUMN plan_type;
    ALTER TABLE public.feature_flag_subscriptions RENAME COLUMN plan_type_v2_tmp TO plan_type;
    ALTER TABLE public.feature_flag_subscriptions ALTER COLUMN plan_type SET NOT NULL;
  END IF;
END $$;

-- Step 3: Update esrs_datapoints mandatory_for (uses mandatory_mode enum from migration 11)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mandatory_mode') THEN
    -- Create new mandatory_mode enum
    CREATE TYPE mandatory_mode_v2 AS ENUM ('vsme_basic', 'vsme_comprehensive', 'csrd');
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'esrs_datapoints' AND column_name = 'mandatory_for') THEN

    -- Add tmp column
    ALTER TABLE public.esrs_datapoints
      ADD COLUMN IF NOT EXISTS mandatory_for_tmp mandatory_mode_v2;

    -- Migrate data
    UPDATE public.esrs_datapoints
      SET mandatory_for_tmp = CASE
        WHEN mandatory_for::text = 'vsme_lite' THEN 'vsme_basic'::mandatory_mode_v2
        WHEN mandatory_for::text = 'vsme_full' THEN 'vsme_comprehensive'::mandatory_mode_v2
        WHEN mandatory_for::text = 'csrd_full' THEN 'csrd'::mandatory_mode_v2
        ELSE 'vsme_basic'::mandatory_mode_v2
      END;

    ALTER TABLE public.esrs_datapoints DROP COLUMN mandatory_for;
    ALTER TABLE public.esrs_datapoints RENAME COLUMN mandatory_for_tmp TO mandatory_for;
  END IF;
END $$;

-- Step 4: Update feature flags that reference old plan_type values
UPDATE public.feature_flag_subscriptions
SET
  pollution_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  water_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  biodiversity_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  circular_economy_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  workforce_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  valuechain_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  communities_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  consumers_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  business_conduct_enabled = (plan_type IN ('vsme_comprehensive', 'csrd')),
  taxonomy_enabled = (plan_type = 'csrd')
WHERE plan_type IS NOT NULL;

-- Step 5: Drop old enum types (if no other columns reference them)
-- Note: DROP TYPE may fail if other tables/columns still reference the old type.
-- This is safe to run — Postgres will raise a notice if dependencies remain.
DO $$ BEGIN
  DROP TYPE IF EXISTS plan_type;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not drop plan_type — may still be referenced elsewhere';
END $$;

DO $$ BEGIN
  DROP TYPE IF EXISTS plan_type_new;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not drop plan_type_new';
END $$;

DO $$ BEGIN
  DROP TYPE IF EXISTS mandatory_mode;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Could not drop mandatory_mode';
END $$;
