-- Demo seed for entrepanas (Venezuelan examples). Re-runnable: run with
--   npx wrangler d1 execute entrepanas --local --file=./scripts/seed.sql
-- NOTE: kept OUT of ./drizzle (the migrations_dir) on purpose, so
-- `wrangler d1 migrations apply` never runs this destructive seed against prod.
-- Demo users have a non-functional password (browse-only). Create real sign-in
-- accounts via /register; promote one to admin with:
--   UPDATE user SET role='admin' WHERE email='<yours>';

-- Clean any previous seed rows first (idempotent re-run). All seed ids are prefixed `seed-`.
DELETE FROM abuse_report WHERE id LIKE 'seed-%';
DELETE FROM verification_review WHERE id LIKE 'seed-%';
DELETE FROM donation_expense_link WHERE id LIKE 'seed-%';
DELETE FROM evidence_image WHERE id LIKE 'seed-%';
DELETE FROM expense_item WHERE id LIKE 'seed-%';
DELETE FROM expense WHERE id LIKE 'seed-%';
DELETE FROM donation_confirmation WHERE id LIKE 'seed-%';
DELETE FROM donation WHERE id LIKE 'seed-%';
DELETE FROM payout_method WHERE id LIKE 'seed-%';
DELETE FROM recipient_verification WHERE id LIKE 'seed-%';
DELETE FROM campaign WHERE id LIKE 'seed-%';
DELETE FROM recipient_profile WHERE id LIKE 'seed-%';
DELETE FROM user WHERE id LIKE 'seed-%';

INSERT INTO user (id, name, email, email_verified, role, created_at, updated_at) VALUES
  ('seed-u1', 'Comedor Esperanza', 'comedor.esperanza@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u2', 'Fundación Buen Vecino', 'buen.vecino@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u3', 'Hogar San José', 'hogar.sanjose@entrepanas.local', 1, 'recipient', 1735689600000, 1735689600000),
  ('seed-u4', 'Manos Solidarias', 'manos.solidarias@entrepanas.local', 0, 'recipient', 1735689600000, 1735689600000),
  ('seed-u5', 'Casa del Buen Samaritano', 'buen.samaritano@entrepanas.local', 0, 'recipient', 1735689600000, 1735689600000),
  ('seed-u6', 'Carlos Donante', 'carlos@entrepanas.local', 1, 'donor', 1735689600000, 1735689600000);

INSERT INTO recipient_profile
  (id, user_id, slug, legal_name, public_name, phone, email, country, region, city, neighborhood, exact_address, bio,
   identity_verification_status, payout_verification_status, location_verification_status, trust_level, risk_flags_count, frozen, created_at, updated_at)
VALUES
  ('seed-rp1', 'seed-u1', 'comedor-esperanza', 'Asociación Civil Comedor Esperanza', 'Comedor Esperanza',
   '+584141234567', 'comedor.esperanza@entrepanas.local', 'Venezuela', 'Distrito Capital', 'Caracas', 'Catia', 'Av. Principal, Casa 42',
   'Comedor comunitario que sirve almuerzos a 60 niños y adultos mayores en la parroquia Catia cada día.',
   'verified', 'verified', 'verified', 'trusted', 0, 0, 1735689600000, 1735689600000),
  ('seed-rp2', 'seed-u2', 'fundacion-buen-vecino', 'Fundación Buen Vecino', 'Fundación Buen Vecino',
   '+584161234567', 'buen.vecino@entrepanas.local', 'Venezuela', 'Zulia', 'Maracaibo', 'Centro', 'Calle 72, Edif. 12',
   'Acompañamos a adultos mayores en condición de vulnerabilidad con alimentos, medicinas y visitas.',
   'verified', 'verified', 'pending', 'payout', 0, 0, 1735689600000, 1735689600000),
  ('seed-rp3', 'seed-u3', 'hogar-san-jose', 'Hogar San José AC', 'Hogar San José',
   '+584121234567', 'hogar.sanjose@entrepanas.local', 'Venezuela', 'Carabobo', 'Valencia', 'Naguanagua', 'Urb. La Paz, Casa 8',
   'Hogar de paso para familias con niños. Necesitamos reparar el techo antes de la temporada de lluvias.',
   'verified', 'pending', 'verified', 'identity', 0, 0, 1735689600000, 1735689600000),
  ('seed-rp4', 'seed-u4', 'manos-solidarias', 'Manos Solidarias AC', 'Manos Solidarias',
   NULL, NULL, 'Venezuela', 'Aragua', 'Maracay', NULL, NULL,
   'Compramos insumos médicos para pacientes crónicos que no pueden costear sus tratamientos.',
   'pending', 'pending', 'pending', 'none', 0, 0, 1735689600000, 1735689600000),
  ('seed-rp5', 'seed-u5', 'casa-buen-samaritano', 'Casa del Buen Samaritano', 'Casa del Buen Samaritano',
   '+584241234567', 'buen.samaritano@entrepanas.local', 'Venezuela', 'Lara', 'Barquisimeto', 'Oeste', 'Calle 10, Qta. 5',
   'Banco de alimentos que distribuye víveres a 12 comunidades del oeste de la ciudad.',
   'verified', 'verified', 'verified', 'trusted', 0, 0, 1735689600000, 1735689600000);

INSERT INTO campaign
  (id, recipient_profile_id, slug, title, summary, goal_cents, currency, status, created_at, updated_at)
VALUES
  ('seed-cp1', 'seed-rp1', 'comidas-enero', 'Comidas de enero', 'Alimentos para todo el mes en el comedor de Catia.', 1500000, 'USD', 'active', 1735689600000, 1735689600000),
  ('seed-cp2', 'seed-rp2', 'medicinas-abuelos', 'Medicinas para los abuelos', 'Tratamientos crónicos para 14 adultos mayores.', 900000, 'USD', 'active', 1735689600000, 1735689600000),
  ('seed-cp3', 'seed-rp3', 'reparar-techo', 'Reparar el techo', 'Cambiar láminas y canaletas antes de las lluvias.', 2000000, 'USD', 'active', 1735689600000, 1735689600000);

INSERT INTO payout_method (id, recipient_profile_id, label, details, verification_status, created_at, updated_at) VALUES
  ('seed-pm1', 'seed-rp1', 'Pago móvil', 'Banesco · 0134-0123-45-6789012345 · C.I. 12.345.678', 'verified', 1735689600000, 1735689600000),
  ('seed-pm2', 'seed-rp1', 'Cuenta bancaria', 'Banco de Venezuela · 0102-0567-89-1234567890', 'verified', 1735689600000, 1735689600000),
  ('seed-pm3', 'seed-rp2', 'Pago móvil', 'Mercantil · 0105-0987-65-4321098765 · C.I. 23.456.789', 'verified', 1735689600000, 1735689600000),
  ('seed-pm4', 'seed-rp3', 'Pago móvil', 'Provincial · 0108-0765-43-2109876543 · C.I. 34.567.890', 'pending', 1735689600000, 1735689600000),
  ('seed-pm5', 'seed-rp5', 'Zelle', 'casa.buen.samaritano@banesco.com', 'verified', 1735689600000, 1735689600000);

INSERT INTO recipient_verification (id, recipient_profile_id, kind, status, submitted_at) VALUES
  ('seed-rv1', 'seed-rp1', 'identity', 'approved', 1735689600000),
  ('seed-rv2', 'seed-rp1', 'payout', 'approved', 1735689600000),
  ('seed-rv3', 'seed-rp1', 'location', 'approved', 1735689600000),
  ('seed-rv4', 'seed-rp2', 'identity', 'approved', 1735689600000),
  ('seed-rv5', 'seed-rp2', 'payout', 'approved', 1735689600000),
  ('seed-rv6', 'seed-rp2', 'location', 'pending', 1735689600000),
  ('seed-rv7', 'seed-rp3', 'identity', 'approved', 1735689600000),
  ('seed-rv8', 'seed-rp3', 'location', 'approved', 1735689600000),
  ('seed-rv9', 'seed-rp5', 'identity', 'approved', 1735689600000),
  ('seed-rv10', 'seed-rp5', 'payout', 'approved', 1735689600000),
  ('seed-rv11', 'seed-rp5', 'location', 'approved', 1735689600000);

INSERT INTO donation (id, campaign_id, donor_user_id, amount_cents, currency, status, message, created_at) VALUES
  ('seed-dn1', 'seed-cp1', 'seed-u6', 5000, 'USD', 'sent', 'Gracias por la labor', 1735776000000),
  ('seed-dn2', 'seed-cp1', NULL, 12000, 'USD', 'sent', NULL, 1735862400000),
  ('seed-dn3', 'seed-cp2', 'seed-u6', 8000, 'USD', 'sent', 'Para las medicinas', 1735862400000);

INSERT INTO donation_confirmation (id, donation_id, donor_user_id, amount_cents, currency, sent_at, method_note, created_at) VALUES
  ('seed-dc1', 'seed-dn1', 'seed-u6', 5000, 'USD', 1735776000000, 'Pago móvil Banesco', 1735776000000),
  ('seed-dc3', 'seed-dn3', 'seed-u6', 8000, 'USD', 1735862400000, 'Transferencia Mercantil', 1735862400000);

INSERT INTO expense (id, campaign_id, recipient_profile_id, title, total_cents, currency, incurred_at, created_at) VALUES
  ('seed-ex1', 'seed-cp1', 'seed-rp1', 'Compras de la semana', 42000, 'USD', 1735689600000, 1735689600000);

INSERT INTO expense_item (id, expense_id, title, amount_cents, quantity) VALUES
  ('seed-ei1', 'seed-ex1', 'Arroz (10 kg)', 12000, 2),
  ('seed-ei2', 'seed-ex1', 'Harina PAN (24 paq)', 6000, 2),
  ('seed-ei3', 'seed-ex1', 'Aceite vegetal (5 L)', 4000, 3),
  ('seed-ei4', 'seed-ex1', 'Lentejas (5 kg)', 5000, 1),
  ('seed-ei5', 'seed-ex1', 'Carne molida (3 kg)', 15000, 1);
