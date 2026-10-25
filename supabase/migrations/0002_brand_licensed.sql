-- Brands made under GOODMAX licence are listed under the GOODMAX logo on the group page (/group);
-- the others are Vistar-Bouti's own brands. Structural like `visible`: applies on save, no publish step.
alter table public.brands add column if not exists licensed boolean not null default false;
