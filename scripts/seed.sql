-- Demo seed for entrepanas (Venezuelan examples). Re-runnable: run with
--   npx wrangler d1 execute entrepanas --local --file=./scripts/seed.sql
-- NOTE: kept OUT of ./drizzle (the migrations_dir) on purpose, so
-- `wrangler d1 migrations apply` never runs this destructive seed against prod.
-- Demo users have a non-functional password (browse-only). Create real sign-in
-- accounts via /register; promote one to admin with:
--   UPDATE user SET role='admin' WHERE email='<yours>';

-- Clean any previous seed rows first (idempotent re-run). All seed ids are prefixed `seed-`.
DELETE FROM expense WHERE id LIKE 'seed-%';
DELETE FROM donation_expense_link WHERE id LIKE 'seed-%';
DELETE FROM donation WHERE id LIKE 'seed-%';
DELETE FROM campaign WHERE id LIKE 'seed-%';
DELETE FROM recipient_profile WHERE id LIKE 'seed-%';
DELETE FROM user WHERE id LIKE 'seed-%';

INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at) VALUES
  ('seed-u1', 'Comedor Esperanza', 'comedor.esperanza@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u2', 'Fundación Buen Vecino', 'buen.vecino@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u3', 'Hogar San José', 'hogar.sanjose@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u4', 'Manos Solidarias', 'manos.solidarias@entrepanas.local', 0, 'recipient', 1735689600000, 1735689600000),
  ('seed-u5', 'Casa del Buen Samaritano', 'buen.samaritano@entrepanas.local', 0, 'recipient', 1735689600000, 1735689600000);

INSERT INTO recipient_profile
  (id, user_id, slug, legal_name, public_name, country, region, city, bio,
   identity_verification_status, payout_verification_status, location_verification_status, trust_level, created_at, updated_at)
VALUES
  ('seed-rp1', 'seed-u1', 'comedor-esperanza', 'Asociación Civil Comedor Esperanza', 'Comedor Esperanza',
   'Venezuela', 'Distrito Capital', 'Caracas',
   'Comedor comunitario que sirve almuerzos a 60 niños y adultos mayores en la parroquia Catia cada día.',
   'verified', 'verified', 'verified', 'trusted', 1735689600000, 1735689600000),
  ('seed-rp2', 'seed-u2', 'fundacion-buen-vecino', 'Fundación Buen Vecino', 'Fundación Buen Vecino',
   'Venezuela', 'Zulia', 'Maracaibo',
   'Acompañamos a adultos mayores en condición de vulnerabilidad con alimentos, medicinas y visitas.',
   'verified', 'verified', 'pending', 'payout', 1735689600000, 1735689600000),
  ('seed-rp3', 'seed-u3', 'hogar-san-jose', 'Hogar San José AC', 'Hogar San José',
   'Venezuela', 'Carabobo', 'Valencia',
   'Hogar de paso para familias con niños. Necesitamos reparar el techo antes de la temporada de lluvias.',
   'verified', 'pending', 'verified', 'identity', 1735689600000, 1735689600000),
  ('seed-rp4', 'seed-u4', 'manos-solidarias', 'Manos Solidarias AC', 'Manos Solidarias',
   'Venezuela', 'Aragua', 'Maracay',
   'Compramos insumos médicos para pacientes crónicos que no pueden costear sus tratamientos.',
   'pending', 'pending', 'pending', 'none', 1735689600000, 1735689600000),
  ('seed-rp5', 'seed-u5', 'casa-buen-samaritano', 'Casa del Buen Samaritano', 'Casa del Buen Samaritano',
   'Venezuela', 'Lara', 'Barquisimeto',
   'Banco de alimentos que distribuye víveres a 12 comunidades del oeste de la ciudad.',
   'verified', 'verified', 'verified', 'trusted', 1735689600000, 1735689600000);

INSERT INTO campaign
  (id, recipient_profile_id, slug, title, summary, goal_cents, currency, status, created_at, updated_at)
VALUES
  ('seed-cp1', 'seed-rp1', 'comidas-enero', 'Comidas de enero', 'Alimentos para todo el mes en el comedor de Catia.', 1500000, 'USD', 'active', 1735689600000, 1735689600000),
  ('seed-cp2', 'seed-rp2', 'medicinas-abuelos', 'Medicinas para los abuelos', 'Tratamientos crónicos para 14 adultos mayores.', 900000, 'USD', 'active', 1735689600000, 1735689600000),
  ('seed-cp3', 'seed-rp3', 'reparar-techo', 'Reparar el techo', 'Cambiar láminas y canaletas antes de las lluvias.', 2000000, 'USD', 'active', 1735689600000, 1735689600000);

INSERT INTO donation (id, campaign_id, donor_user_id, amount_cents, currency, status, message, created_at) VALUES
  ('seed-dn1', 'seed-cp1', NULL, 5000, 'USD', 'sent', 'Gracias por la labor', 1735776000000),
  ('seed-dn2', 'seed-cp1', NULL, 12000, 'USD', 'sent', NULL, 1735862400000),
  ('seed-dn3', 'seed-cp2', NULL, 8000, 'USD', 'sent', 'Para las medicinas', 1735862400000);

INSERT INTO expense (id, campaign_id, recipient_profile_id, title, total_cents, currency, incurred_at, created_at) VALUES
  ('seed-ex1', 'seed-cp1', 'seed-rp1', 'Compras de la semana', 42000, 'USD', 1735689600000, 1735689600000);
