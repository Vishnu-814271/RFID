-- V7__add_people_joining_date.sql
ALTER TABLE people ADD COLUMN IF NOT EXISTS joining_date DATE;
CREATE INDEX IF NOT EXISTS idx_people_joining_date ON people(joining_date);
