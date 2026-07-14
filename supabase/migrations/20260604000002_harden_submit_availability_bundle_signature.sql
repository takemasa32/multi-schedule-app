DROP FUNCTION IF EXISTS public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb
);

REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  jsonb
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  jsonb
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  jsonb
) FROM authenticated;
