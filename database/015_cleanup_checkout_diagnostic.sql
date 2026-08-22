-- 015_cleanup_checkout_diagnostic.sql
-- Remove exclusivamente a conta técnica criada para diagnosticar a validação SumUp.

delete from universe.users
 where lower(email) = 'sumup-diagnostico-20260822@carolsol.invalid';
