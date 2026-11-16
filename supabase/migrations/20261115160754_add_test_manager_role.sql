-- Align the role catalog with the existing backend and admin UI allow-lists.
-- This adds a role definition only; no user receives new privileges.
ALTER TABLE public.roles DROP CONSTRAINT roles_code_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_code_check CHECK (
    code IN ('student', 'editor', 'test_manager', 'administrator', 'super_administrator')
);

INSERT INTO public.roles (code, display_name)
VALUES ('test_manager', 'Test manager')
ON CONFLICT (code) DO NOTHING;
