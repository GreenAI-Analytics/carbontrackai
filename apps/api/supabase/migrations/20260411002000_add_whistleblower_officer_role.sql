-- Add whistleblower_officer to user_role enum — Migration 20a
-- Must run in its own transaction before the value can be used in RLS policies.
ALTER TYPE user_role ADD VALUE 'whistleblower_officer';
