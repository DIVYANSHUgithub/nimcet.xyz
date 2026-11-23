
-- Existing tests retain their access; subsequently created non-PYQ tests default to paid.
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.tests ADD COLUMN pass_required boolean DEFAULT false;
ALTER TABLE public.tests ALTER COLUMN pass_required DROP DEFAULT;
ALTER TABLE public.tests ADD CONSTRAINT pyq_pass_always_free
    CHECK (kind <> 'pyq' OR pass_required IS NOT TRUE);

CREATE TABLE public.pass_seasons (
    id text PRIMARY KEY,
    standard_amount integer NOT NULL CHECK (standard_amount >= 100),
    checkout_closes_at timestamptz NOT NULL,
    ends_at timestamptz NOT NULL,
    offer_label text,
    offer_amount integer,
    offer_starts_at timestamptz,
    offer_ends_at timestamptz,
    CHECK (checkout_closes_at = ends_at - interval '24 hours'),
    CHECK (
        (offer_label IS NULL AND offer_amount IS NULL AND offer_starts_at IS NULL AND offer_ends_at IS NULL)
        OR (offer_label IS NOT NULL AND offer_amount IS NOT NULL AND offer_starts_at IS NOT NULL
            AND offer_ends_at IS NOT NULL AND offer_amount >= 100 AND offer_amount < standard_amount
            AND offer_starts_at < offer_ends_at AND offer_ends_at <= checkout_closes_at)
    )
);
INSERT INTO public.pass_seasons (id, standard_amount, checkout_closes_at, ends_at)
VALUES ('nimcet-2027', 29900, '2027-06-30 00:00:00+05:30', '2027-07-01 00:00:00+05:30');

CREATE TABLE public.pass_orders (
    id uuid PRIMARY KEY,
    season_id text NOT NULL REFERENCES public.pass_seasons(id),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    amount integer NOT NULL CHECK (amount >= 100),
    standard_amount integer NOT NULL CHECK (standard_amount >= amount),
    offer_label text,
    gateway_order_id text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    reconciled_at timestamptz,
    closed_at timestamptz
);
CREATE UNIQUE INDEX pass_orders_open_per_student ON public.pass_orders (user_id, season_id) WHERE closed_at IS NULL;
CREATE INDEX pass_orders_student_history ON public.pass_orders (user_id, season_id, created_at DESC);
CREATE INDEX pass_orders_season_idx ON public.pass_orders (season_id);
CREATE INDEX pass_orders_reconcile_idx ON public.pass_orders (reconciled_at NULLS FIRST, created_at)
    WHERE gateway_order_id IS NOT NULL;
CREATE INDEX pass_orders_approver_idx ON public.pass_orders (approved_by) WHERE approved_by IS NOT NULL;

CREATE TABLE public.pass_payments (
    gateway_payment_id text PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.pass_orders(id) ON DELETE RESTRICT,
    is_primary boolean NOT NULL,
    confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    received_after_cutoff boolean NOT NULL DEFAULT false,
    refund_status text CHECK (refund_status IN ('requested', 'pending', 'processed', 'failed')),
    refund_operation_id uuid UNIQUE,
    gateway_refund_id text UNIQUE,
    refund_reason text
);
CREATE UNIQUE INDEX pass_payments_primary_per_order ON public.pass_payments (order_id) WHERE is_primary;
CREATE INDEX pass_payments_order_idx ON public.pass_payments (order_id);
CREATE INDEX pass_payments_queue_idx ON public.pass_payments (confirmed_at DESC, gateway_payment_id);

CREATE TABLE public.pass_payment_events (
    event_id text PRIMARY KEY,
    event_type text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.student_device_sessions (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_type text NOT NULL CHECK (device_type IN ('mobile', 'desktop')),
    session_id uuid NOT NULL,
    claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (user_id, device_type),
    UNIQUE (user_id, session_id)
);

ALTER TABLE public.pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pass_payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_device_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pass_seasons, public.pass_orders, public.pass_payments,
    public.pass_payment_events, public.student_device_sessions FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
  IF to_regrole('nimcet_backend') IS NOT NULL THEN
    GRANT SELECT, UPDATE ON public.pass_seasons TO nimcet_backend;
    GRANT SELECT, INSERT, UPDATE ON public.pass_orders, public.pass_payments,
        public.student_device_sessions TO nimcet_backend;
    GRANT SELECT, INSERT ON public.pass_payment_events TO nimcet_backend;
    GRANT UPDATE (pass_required) ON public.tests TO nimcet_backend;
    CREATE POLICY pass_backend_seasons ON public.pass_seasons TO nimcet_backend USING (true) WITH CHECK (true);
    CREATE POLICY pass_backend_orders ON public.pass_orders TO nimcet_backend USING (true) WITH CHECK (true);
    CREATE POLICY pass_backend_payments ON public.pass_payments TO nimcet_backend USING (true) WITH CHECK (true);
    CREATE POLICY pass_backend_events ON public.pass_payment_events TO nimcet_backend USING (true) WITH CHECK (true);
    CREATE POLICY pass_backend_devices ON public.student_device_sessions TO nimcet_backend USING (true) WITH CHECK (true);
  END IF;
END $$;
