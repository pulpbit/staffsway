-- Migration 0031: Repair client codes left NULL by the 0016 backfill.
--
-- 0016 added client_code and tried to derive one from the client name with a
-- recursive CTE, but that expression did not evaluate (the CTE was nested inside
-- a correlated scalar subquery), so every pre-existing client kept
-- client_code = NULL. `idx_clients_client_code` still allowed this because
-- SQLite treats NULLs as distinct, so the gap went unnoticed until the Clients
-- page rendered blank codes and blank contact details.
--
-- This rebuilds a code for every row that is NULL/blank: the first four
-- alphanumeric characters of the name, with a "-NN" suffix on repeats.
--
-- Note on style: backend/src/utils/clientCode.ts derives *initials* for codes
-- created at runtime (WFC for "Warehouse Facility Care"), whereas this repair
-- takes the first four alphanumerics (WARE). Codes are assigned once and are
-- never regenerated on edit, so the difference is cosmetic and cannot collide
-- with runtime codes - runtime lookup checks "<base>", "<base>%" and
-- "<base>-%", and initials never match a 4-character prefix in practice.
--
-- client_code carries a UNIQUE index, so a violation here would abort the entire
-- migration rather than skip one row. Two collision cases must be avoided:
--   1. Two blank rows generating the same base       -> ROW_NUMBER over pending.
--   2. A blank row generating a base a filled row already owns -> the occupied
--      set is folded into the numbering.
-- Every CTE is MATERIALIZED. Without that, SQLite evaluates them lazily against
-- the table being updated, so each code written earlier in the same statement
-- re-enters `occupied` and shifts the remaining suffixes (producing WARE-03
-- directly after WARE, with -02 skipped).
--
-- Any row whose candidate is still taken falls back to "<base>-<id>", which is
-- unique because id is unique.

WITH occupied AS MATERIALIZED (
  SELECT client_code AS code
  FROM clients
  WHERE client_code IS NOT NULL AND TRIM(client_code) <> ''
),
pending AS MATERIALIZED (
  SELECT
    id,
    -- Take the first four characters of the name, then drop separators and
    -- punctuation so the base is alphanumeric. A name with no alphanumerics at
    -- all ("...", "---") collapses to an empty string and falls back to "CL".
    COALESCE(
      NULLIF(
        SUBSTR(
          UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            SUBSTR(TRIM(name), 1, 4),
            ' ', ''),
            '-', ''),
            '/', ''),
            '.', ''),
            ',', ''),
            '&', ''),
            '(', ''),
            ')', ''),
            '''', '')),
          1, 4),
        ''),
      'CL'
    ) AS base
  FROM clients
  WHERE client_code IS NULL OR TRIM(client_code) = ''
),
ranked AS MATERIALIZED (
  SELECT
    p.id,
    p.base,
    ROW_NUMBER() OVER (PARTITION BY p.base ORDER BY p.id) AS rn
  FROM pending p
),
candidates AS MATERIALIZED (
  SELECT
    id,
    base,
    CASE
      -- Base is already owned by an existing row: start the sequence at -02.
      WHEN EXISTS (SELECT 1 FROM occupied o WHERE o.code = r.base)
        THEN r.base || '-' || printf('%02d', r.rn + 1)
      ELSE CASE
        WHEN r.rn = 1 THEN r.base
        ELSE r.base || '-' || printf('%02d', r.rn)
      END
    END AS code
  FROM ranked r
),
assigned AS MATERIALIZED (
  SELECT
    c.id,
    CASE
      WHEN EXISTS (SELECT 1 FROM occupied o WHERE o.code = c.code)
        THEN c.base || '-' || c.id
      ELSE c.code
    END AS code
  FROM candidates c
)
UPDATE clients
SET client_code = (SELECT a.code FROM assigned a WHERE a.id = clients.id),
    updated_at = datetime('now')
WHERE id IN (SELECT id FROM assigned);