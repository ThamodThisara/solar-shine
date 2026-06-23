
-- Create the navigation_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.navigation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  path TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the company_info table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the social_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create the footer_links table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create stored procedures for navigation_items
CREATE OR REPLACE FUNCTION public.get_navigation_items()
RETURNS SETOF public.navigation_items
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT * FROM public.navigation_items ORDER BY "order" ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_max_navigation_order()
RETURNS TABLE(max_order INTEGER)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(MAX("order"), 0) as max_order FROM public.navigation_items;
$$;

CREATE OR REPLACE FUNCTION public.update_navigation_item(
  item_id UUID,
  item_title TEXT,
  item_path TEXT,
  item_order INTEGER
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.navigation_items
  SET 
    title = item_title,
    path = item_path,
    "order" = item_order,
    updated_at = NOW()
  WHERE id = item_id;
$$;

CREATE OR REPLACE FUNCTION public.add_navigation_item(
  item_title TEXT,
  item_path TEXT,
  item_order INTEGER
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO public.navigation_items (title, path, "order")
  VALUES (item_title, item_path, item_order);
$$;

CREATE OR REPLACE FUNCTION public.delete_navigation_item(item_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  DELETE FROM public.navigation_items WHERE id = item_id;
$$;

-- Create stored procedures for company_info
CREATE OR REPLACE FUNCTION public.get_company_info()
RETURNS SETOF public.company_info
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT * FROM public.company_info LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.update_company_info(
  company_id UUID,
  company_name TEXT,
  company_description TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.company_info
  SET 
    name = company_name,
    description = company_description,
    address = company_address,
    email = company_email,
    phone = company_phone,
    updated_at = NOW()
  WHERE id = company_id;
$$;

-- Create stored procedures for social_links
CREATE OR REPLACE FUNCTION public.get_social_links()
RETURNS SETOF public.social_links
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT * FROM public.social_links;
$$;

CREATE OR REPLACE FUNCTION public.update_social_link(
  link_id UUID,
  link_name TEXT,
  link_icon TEXT,
  link_url TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.social_links
  SET 
    name = link_name,
    icon = link_icon,
    url = link_url,
    updated_at = NOW()
  WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.add_social_link(
  link_name TEXT,
  link_icon TEXT,
  link_url TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO public.social_links (name, icon, url)
  VALUES (link_name, link_icon, link_url);
$$;

CREATE OR REPLACE FUNCTION public.delete_social_link(link_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  DELETE FROM public.social_links WHERE id = link_id;
$$;

-- Create stored procedures for footer_links
CREATE OR REPLACE FUNCTION public.get_footer_links()
RETURNS SETOF public.footer_links
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT * FROM public.footer_links;
$$;

CREATE OR REPLACE FUNCTION public.update_footer_link(
  link_id UUID,
  link_name TEXT,
  link_url TEXT,
  link_category TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE public.footer_links
  SET 
    name = link_name,
    url = link_url,
    category = link_category,
    updated_at = NOW()
  WHERE id = link_id;
$$;

CREATE OR REPLACE FUNCTION public.add_footer_link(
  link_name TEXT,
  link_url TEXT,
  link_category TEXT
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO public.footer_links (name, url, category)
  VALUES (link_name, link_url, link_category);
$$;

CREATE OR REPLACE FUNCTION public.delete_footer_link(link_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  DELETE FROM public.footer_links WHERE id = link_id;
$$;

-- Initial data insertion (only if tables are empty)
INSERT INTO public.company_info (name, description, address, email, phone)
SELECT 'Your Company Name', 'Your company description...', '123 Main St, City, Country', 'contact@example.com', '+1 234 567 8900'
WHERE NOT EXISTS (SELECT 1 FROM public.company_info LIMIT 1);

INSERT INTO public.social_links (name, icon, url)
SELECT 'Facebook', 'facebook', 'https://facebook.com/yourcompany'
WHERE NOT EXISTS (SELECT 1 FROM public.social_links LIMIT 1);

INSERT INTO public.social_links (name, icon, url)
SELECT 'Twitter', 'twitter', 'https://twitter.com/yourcompany'
WHERE NOT EXISTS (SELECT 1 FROM public.social_links WHERE name = 'Twitter');

INSERT INTO public.social_links (name, icon, url)
SELECT 'Instagram', 'instagram', 'https://instagram.com/yourcompany'
WHERE NOT EXISTS (SELECT 1 FROM public.social_links WHERE name = 'Instagram');

INSERT INTO public.navigation_items (title, path, "order")
SELECT 'Home', '/', 1
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items LIMIT 1);

INSERT INTO public.navigation_items (title, path, "order")
SELECT 'Services', '/services', 2
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE path = '/services');

INSERT INTO public.navigation_items (title, path, "order")
SELECT 'Projects', '/projects', 3
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE path = '/projects');

INSERT INTO public.navigation_items (title, path, "order")
SELECT 'About', '/about', 4
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE path = '/about');

INSERT INTO public.navigation_items (title, path, "order")
SELECT 'Contact', '/contact', 5
WHERE NOT EXISTS (SELECT 1 FROM public.navigation_items WHERE path = '/contact');

-- Add an about_content record if it doesn't exist
CREATE TABLE IF NOT EXISTS public.about_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT,
  main_image TEXT,
  mission_title TEXT,
  mission_description TEXT,
  vision_title TEXT,
  vision_description TEXT,
  image_one TEXT,
  image_two TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.about_content (title, subtitle, content, mission_title, mission_description, vision_title, vision_description)
SELECT 
  'About Our Company',
  'Your Trusted Partner in Construction Excellence Since 1995',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla quam velit, vulputate eu pharetra nec, mattis ac neque. Duis vulputate commodo lectus, ac blandit elit tincidunt id.',
  'Our Mission',
  'To provide exceptional construction services that exceed client expectations through innovation, quality craftsmanship, and dedication to excellence.',
  'Our Vision',
  'To be the premier construction company known for integrity, quality, and transformative projects that enhance communities.'
WHERE NOT EXISTS (SELECT 1 FROM public.about_content LIMIT 1);
