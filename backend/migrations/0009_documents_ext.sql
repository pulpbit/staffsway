-- Migration 0009: Document Management Enhancement
-- Adds updated_at column to employee_documents

ALTER TABLE employee_documents ADD COLUMN updated_at TEXT;
