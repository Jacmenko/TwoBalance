-- Expense description is optional (max 120 characters). The existing
-- expenses_before_write trigger already trims it, so blank input is stored as ''.
alter table public.expenses drop constraint expenses_description_check;
alter table public.expenses
  add constraint expenses_description_check check (char_length(description) <= 120);
alter table public.expenses alter column description set default '';
