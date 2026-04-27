-- ============================================================================
-- Update plan_type enum and add ESG feature flag columns — Migration 13
-- ============================================================================

-- Step 1: Alter the plan_type enum to support the three SME modes
-- Postgres can't alter enum values in a transaction block, so we create a new type and swap.
DO $$ BEGIN
  CREATE TYPE plan_type_new AS ENUM ('vsme_lite', 'vsme_full', 'csrd_full');
EXCEPTION WHEN duplicate_object THEN
  -- Type already exists; proceed
END $$;

-- Check if we need to migrate from old enum
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type' AND typtype = 'e') THEN
    -- Add a temporary column with the new type
    ALTER TABLE public.feature_flag_subscriptions
      ADD COLUMN IF NOT EXISTS plan_type_tmp plan_type_new;

    -- Migrate data: 'basic' -> 'vsme_lite', 'comprehensive' -> 'vsme_full'
    UPDATE public.feature_flag_subscriptions
      SET plan_type_tmp = CASE
        WHEN plan_type::text = 'basic' THEN 'vsme_lite'::plan_type_new
        WHEN plan_type::text = 'comprehensive' THEN 'vsme_full'::plan_type_new
        ELSE 'vsme_lite'::plan_type_new
      END;

    -- Drop old column and rename new one
    ALTER TABLE public.feature_flag_subscriptions DROP COLUMN plan_type;
    ALTER TABLE public.feature_flag_subscriptions RENAME COLUMN plan_type_tmp TO plan_type;

    -- Make it NOT NULL
    ALTER TABLE public.feature_flag_subscriptions ALTER COLUMN plan_type SET NOT NULL;

    -- Drop the old enum type
    DROP TYPE IF EXISTS plan_type;
  END IF;
END $$;

-- Step 2: Add ESG module feature flag columns (if not already present)
DO $$ BEGIN
  ALTER TABLE public.feature_flag_subscriptions
    ADD COLUMN IF NOT EXISTS esrs2_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS climate_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS pollution_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS water_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS biodiversity_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS circular_economy_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS workforce_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS valuechain_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS communities_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS consumers_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS business_conduct_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS materiality_enabled BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS taxonomy_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS report_builder_enabled BOOLEAN DEFAULT true;
END $$;

-- Step 3: Set defaults based on plan_type for existing rows
UPDATE public.feature_flag_subscriptions
SET
  climate_enabled = true,
  esrs2_enabled = true,
  materiality_enabled = true,
  report_builder_enabled = true,
  pollution_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  water_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  biodiversity_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  circular_economy_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  workforce_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  valuechain_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  communities_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  consumers_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  business_conduct_enabled = (plan_type IN ('vsme_full', 'csrd_full')),
  taxonomy_enabled = (plan_type = 'csrd_full')
WHERE plan_type IS NOT NULL;
