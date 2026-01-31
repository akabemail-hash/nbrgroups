export const setupSqlScript = `-- This script configures your database, sets up Row Level Security (RLS), and seeds initial data.
-- Run this entire script in your Supabase SQL Editor to resolve the security policy error.

-- 1. Create tables (using IF NOT EXISTS to be safe on re-runs)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE RESTRICT,
  is_active boolean DEFAULT true,
  language_preference text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_known_latitude numeric,
  last_known_longitude numeric,
  last_location_updated_at timestamptz DEFAULT now(),
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  page_name text NOT NULL,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  can_navigate boolean DEFAULT false,
  can_export boolean DEFAULT false,
  UNIQUE (role_id, page_name)
);

CREATE TABLE IF NOT EXISTS public.customer_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.districts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.no_visit_reasons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone_number text,
  gps_latitude numeric(12, 9),
  gps_longitude numeric(12, 9),
  contact_person_name text,
  contact_person_phone text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  customer_property_id uuid REFERENCES public.customer_properties(id) ON DELETE SET NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_code text NOT NULL UNIQUE,
  name text NOT NULL,
  brand text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  seller_code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone_number text,
  email text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_product_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_group_id uuid REFERENCES public.product_groups(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (seller_id, product_group_id)
);

CREATE TABLE IF NOT EXISTS public.merchs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  merch_code text NOT NULL UNIQUE,
  name text NOT NULL,
  phone_number text,
  email text UNIQUE,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seller_merch_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  merch_id uuid NOT NULL REFERENCES public.merchs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, merch_id)
);

CREATE TABLE IF NOT EXISTS public.customer_seller_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (customer_id, seller_id)
);

CREATE TABLE IF NOT EXISTS public.customer_merch_relationships (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  merch_id uuid REFERENCES public.merchs(id) ON DELETE CASCADE,
  quantity integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (customer_id, merch_id)
);

CREATE TABLE IF NOT EXISTS public.visit_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  link text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS public.daily_sales_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (seller_id, customer_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.daily_merch_routes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merch_id uuid NOT NULL REFERENCES public.merchs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (merch_id, customer_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.visit_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE,
    merch_id uuid REFERENCES public.merchs(id) ON DELETE CASCADE,
    visit_type_id uuid NOT NULL REFERENCES public.visit_types(id) ON DELETE RESTRICT,
    request_date date NOT NULL,
    description text,
    photo_url text,
    status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Cancelled')),
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz,
    completion_notes text,
    completion_photo_before_url text,
    completion_photo_after_url text,
    completion_latitude numeric(12, 9),
    completion_longitude numeric(12, 9),
    admin_rating smallint CHECK (admin_rating >= 1 AND admin_rating <= 5),
    CONSTRAINT visit_requests_assignee_check CHECK ((num_nonnulls(seller_id, merch_id) = 1))
);

CREATE TABLE IF NOT EXISTS public.seller_visits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    visit_type_id uuid REFERENCES public.visit_types(id) ON DELETE RESTRICT,
    visit_datetime timestamptz NOT NULL DEFAULT now(),
    description text,
    before_image_urls text[],
    after_image_urls text[],
    is_visit boolean DEFAULT true,
    no_visit_reason_id uuid REFERENCES public.no_visit_reasons(id) ON DELETE SET NULL,
    no_visit_description text,
    duration_minutes integer,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merch_visits (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    merch_id uuid NOT NULL REFERENCES public.merchs(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    visit_type_id uuid REFERENCES public.visit_types(id) ON DELETE RESTRICT,
    visit_datetime timestamptz NOT NULL DEFAULT now(),
    description text,
    before_image_urls text[],
    after_image_urls text[],
    is_visit boolean DEFAULT true,
    no_visit_reason_id uuid REFERENCES public.no_visit_reasons(id) ON DELETE SET NULL,
    no_visit_description text,
    duration_minutes integer,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- Fix: Add duration_minutes to existing tables if not present
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_visits' AND column_name='duration_minutes') THEN
        ALTER TABLE public.seller_visits ADD COLUMN duration_minutes integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='merch_visits' AND column_name='duration_minutes') THEN
        ALTER TABLE public.merch_visits ADD COLUMN duration_minutes integer;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.visit_product_group_details (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_id uuid NOT NULL,
  visit_type text NOT NULL CHECK (visit_type IN ('seller', 'merch')),
  product_group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  before_image_url text,
  after_image_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.settings (
  key text NOT NULL PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- SEED DATA
INSERT INTO public.user_roles (name, description, is_admin)
VALUES
  ('Admin', 'System Administrator', true),
  ('User', 'Default User', false),
  ('Seller', 'Sales Representative', false),
  ('Merch', 'Merchandiser', false)
ON CONFLICT (name) DO NOTHING;

-- Grant Admin Permissions
DO $body$
DECLARE
    r_id uuid;
    page_list text[] := ARRAY[
        'Dashboard', 'Daily Plan', 'User Management', 'Role Management', 
        'Permission Management', 'Customers', 'Customers Map', 'Sellers', 
        'Merchandisers', 'Customer-Seller Relations', 'Customer-Merch Relations', 
        'Seller Product Group Relations', 'Seller-Merch Assignments', 'Visit Types', 
        'Send Notification', 'Track', 'Sales Route Planning', 'Merch Route Planning', 
        'Visit Requests', 'Visit Request Merchandiser', 'Visit Request Report', 
        'Visit Request Merch Report', 'Admin Seller Visit Report', 'Admin Merch Visit Report', 
        'My Visit Requests', 'Seller Visit Report', 'Merch Visit Report', 
        'Seller Route Report', 'My Profile', 'Logo Management', 'Fixed Asset Brands', 
        'Fixed Asset Delivery', 'Fixed Asset Delivery Report', 'Sales Dashboard', 
        'Products', 'Product Groups', 'Competitor Price Analysis', 'Competitor Price Analysis Report', 
        'Competitor Price Analysis AI Report', 'Product Display', 'Display Reporting', 
        'Product Shelf', 'Product Shelf Reporting', 'Product Insert', 'Product Insert Reporting', 
        'Problem Types', 'Report a Problem', 'Problem Report', 'Customer Properties', 
        'Districts', 'Sales Route Report', 'Merch Route Report', 'Reasons for No Visits', 
        'Team Dashboard', 'Team Reports'
    ];
    page_name text;
BEGIN
    SELECT id INTO r_id FROM public.user_roles WHERE name = 'Admin' LIMIT 1;
    FOREACH page_name IN ARRAY page_list LOOP
        INSERT INTO public.user_permissions (role_id, page_name, can_view, can_create, can_edit, can_delete, can_navigate, can_export)
        VALUES (r_id, page_name, true, true, true, true, true, true)
        ON CONFLICT (role_id, page_name) DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete,
            can_navigate = EXCLUDED.can_navigate,
            can_export = EXCLUDED.can_export;
    END LOOP;
END;
$body$;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION get_seller_team_stats()
RETURNS TABLE (
  merch_id uuid,
  merch_name text,
  total_planned bigint,
  completed_visits bigint,
  last_known_latitude numeric,
  last_known_longitude numeric,
  last_location_updated_at timestamptz
) AS $body$
DECLARE
    current_seller_id uuid;
    current_day smallint;
BEGIN
    SELECT id INTO current_seller_id FROM public.sellers WHERE user_id = auth.uid();
    SELECT EXTRACT(ISODOW FROM now()) INTO current_day;
    RETURN QUERY
    WITH team AS (SELECT sma.merch_id FROM public.seller_merch_assignments sma WHERE sma.seller_id = current_seller_id),
    planned AS (SELECT dmr.merch_id, COUNT(*) as cnt FROM public.daily_merch_routes dmr WHERE dmr.merch_id IN (SELECT merch_id FROM team) AND dmr.day_of_week = current_day GROUP BY dmr.merch_id),
    actual AS (SELECT mv.merch_id, COUNT(*) as cnt FROM public.merch_visits mv WHERE mv.merch_id IN (SELECT merch_id FROM team) AND mv.visit_datetime::date = now()::date AND mv.is_visit = true GROUP BY mv.merch_id)
    SELECT m.id, m.name, COALESCE(p.cnt, 0)::bigint, COALESCE(a.cnt, 0)::bigint, u.last_known_latitude, u.last_known_longitude, u.last_location_updated_at
    FROM team t JOIN public.merchs m ON t.merch_id = m.id JOIN public.users u ON m.user_id = u.id LEFT JOIN planned p ON m.id = p.merch_id LEFT JOIN actual a ON m.id = a.merch_id;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix: Drop functions before re-creating because CREATE OR REPLACE cannot change the signature of return parameters
DROP FUNCTION IF EXISTS get_sales_route_report(date, date, uuid, uuid, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS get_merch_route_report(date, date, uuid, uuid, uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION get_sales_route_report(
  filter_start_date date,
  filter_end_date date,
  filter_seller_id uuid DEFAULT NULL,
  filter_customer_id uuid DEFAULT NULL,
  filter_district_id uuid DEFAULT NULL,
  filter_status text DEFAULT 'all',
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  route_date date,
  seller_id uuid,
  seller_name text,
  customer_id uuid,
  customer_name text,
  district_name text,
  is_completed boolean,
  visit_id uuid,
  visit_time timestamptz,
  visit_description text,
  is_visit_flag boolean,
  no_visit_reason_text text,
  no_visit_description_text text,
  duration_minutes integer,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(filter_start_date, filter_end_date, '1 day')::date AS d
  ),
  planned_routes AS (
    SELECT
      ds.d AS plan_date,
      dsr.seller_id,
      dsr.customer_id
    FROM date_series ds
    JOIN daily_sales_routes dsr ON dsr.day_of_week = EXTRACT(ISODOW FROM ds.d)
  ),
  filtered_routes AS (
    SELECT
      fr.plan_date,
      fr.seller_id,
      s.name as seller_name,
      fr.customer_id,
      c.name as customer_name,
      d.name as district_name
    FROM planned_routes pr
    JOIN sellers s ON pr.seller_id = s.id
    JOIN customers c ON pr.customer_id = c.id
    LEFT JOIN districts d ON c.district_id = d.id
    WHERE (filter_seller_id IS NULL OR pr.seller_id = filter_seller_id)
      AND (filter_customer_id IS NULL OR pr.customer_id = filter_customer_id)
      AND (filter_district_id IS NULL OR c.district_id = filter_district_id)
  ),
  joined_data AS (
    SELECT
      fr.plan_date,
      fr.seller_id,
      fr.seller_name,
      fr.customer_id,
      fr.customer_name,
      fr.district_name,
      sv.id AS visit_id,
      sv.visit_datetime,
      sv.description,
      COALESCE(sv.is_visit, false) as is_visit_flag,
      nvr.name as no_visit_reason_text,
      sv.no_visit_description as no_visit_description_text,
      sv.duration_minutes,
      CASE WHEN sv.id IS NOT NULL THEN true ELSE false END AS completed
    FROM filtered_routes fr
    LEFT JOIN seller_visits sv ON fr.seller_id = sv.seller_id 
                               AND fr.customer_id = sv.customer_id 
                               AND sv.visit_datetime::date = fr.plan_date
    LEFT JOIN no_visit_reasons nvr ON sv.no_visit_reason_id = nvr.id
  ),
  final_filtered AS (
    SELECT * FROM joined_data
    WHERE (filter_status = 'all')
       OR (filter_status = 'completed' AND completed = true AND is_visit_flag = true)
       OR (filter_status = 'no_visit' AND completed = true AND is_visit_flag = false)
       OR (filter_status = 'pending' AND completed = false)
  ),
  total_rows AS (
    SELECT COUNT(*) AS cnt FROM final_filtered
  )
  SELECT
    jd.plan_date,
    jd.seller_id,
    jd.seller_name,
    jd.customer_id,
    jd.customer_name,
    jd.district_name,
    jd.completed,
    jd.visit_id,
    jd.visit_datetime,
    jd.description,
    jd.is_visit_flag,
    jd.no_visit_reason_text,
    jd.no_visit_description_text,
    jd.duration_minutes,
    tr.cnt
  FROM final_filtered jd, total_rows tr
  ORDER BY jd.plan_date DESC, jd.seller_name ASC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_merch_route_report(
  filter_start_date date,
  filter_end_date date,
  filter_merch_id uuid DEFAULT NULL,
  filter_customer_id uuid DEFAULT NULL,
  filter_district_id uuid DEFAULT NULL,
  filter_status text DEFAULT 'all',
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS TABLE (
  route_date date,
  merch_id uuid,
  merch_name text,
  customer_id uuid,
  customer_name text,
  district_name text,
  is_completed boolean,
  visit_id uuid,
  visit_time timestamptz,
  visit_description text,
  is_visit_flag boolean,
  no_visit_reason_text text,
  no_visit_description_text text,
  duration_minutes integer,
  total_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(filter_start_date, filter_end_date, '1 day')::date AS d
  ),
  planned_routes AS (
    SELECT
      ds.d AS plan_date,
      dmr.merch_id,
      dmr.customer_id
    FROM date_series ds
    JOIN daily_merch_routes dmr ON dmr.day_of_week = EXTRACT(ISODOW FROM ds.d)
  ),
  filtered_routes AS (
    SELECT
      fr.plan_date,
      fr.merch_id,
      m.name as merch_name,
      fr.customer_id,
      c.name as customer_name,
      d.name as district_name
    FROM planned_routes pr
    JOIN merchs m ON pr.merch_id = m.id
    JOIN customers c ON pr.customer_id = c.id
    LEFT JOIN districts d ON c.district_id = d.id
    WHERE (filter_merch_id IS NULL OR pr.merch_id = filter_merch_id)
      AND (filter_customer_id IS NULL OR pr.customer_id = filter_customer_id)
      AND (filter_district_id IS NULL OR c.district_id = filter_district_id)
  ),
  joined_data AS (
    SELECT
      fr.plan_date,
      fr.merch_id,
      fr.merch_name,
      fr.customer_id,
      fr.customer_name,
      fr.district_name,
      mv.id AS visit_id,
      mv.visit_datetime,
      mv.description,
      COALESCE(mv.is_visit, false) as is_visit_flag,
      nvr.name as no_visit_reason_text,
      mv.no_visit_description as no_visit_description_text,
      mv.duration_minutes,
      CASE WHEN mv.id IS NOT NULL THEN true ELSE false END AS completed
    FROM filtered_routes fr
    LEFT JOIN merch_visits mv ON fr.merch_id = mv.merch_id 
                               AND fr.customer_id = mv.customer_id 
                               AND mv.visit_datetime::date = fr.plan_date
    LEFT JOIN no_visit_reasons nvr ON mv.no_visit_reason_id = nvr.id
  ),
  final_filtered AS (
    SELECT * FROM joined_data
    WHERE (filter_status = 'all')
       OR (filter_status = 'completed' AND completed = true AND is_visit_flag = true)
       OR (filter_status = 'no_visit' AND completed = true AND is_visit_flag = false)
       OR (filter_status = 'pending' AND completed = false)
  ),
  total_rows AS (
    SELECT COUNT(*) AS cnt FROM final_filtered
  )
  SELECT
    jd.plan_date,
    jd.merch_id,
    jd.merch_name,
    jd.customer_id,
    jd.customer_name,
    jd.district_name,
    jd.completed,
    jd.visit_id,
    jd.visit_time,
    jd.visit_description,
    jd.is_visit_flag,
    jd.no_visit_reason_text,
    jd.no_visit_description_text,
    jd.duration_minutes,
    tr.cnt
  FROM final_filtered jd, total_rows tr
  ORDER BY jd.plan_date DESC, jd.merch_name ASC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;