
-- Create the content_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'content_images', 'content_images', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'content_images'
);

-- Create a policy to allow public access to read files
INSERT INTO storage.policies (name, definition, bucket_id, action)
SELECT 'Public Read Access', 'true', 'content_images', 'SELECT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies 
  WHERE bucket_id = 'content_images' AND action = 'SELECT'
);

-- Create a policy to allow authenticated users to upload files
INSERT INTO storage.policies (name, definition, bucket_id, action)
SELECT 'Auth Upload Access', 'auth.role() = ''authenticated''', 'content_images', 'INSERT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies 
  WHERE bucket_id = 'content_images' AND action = 'INSERT'
);

-- Create a policy to allow public (including anonymous) upload access
INSERT INTO storage.policies (name, definition, bucket_id, action)
SELECT 'Public Upload Access', 'true', 'content_images', 'INSERT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies 
  WHERE bucket_id = 'content_images' AND action = 'INSERT' AND name = 'Public Upload Access'
);
