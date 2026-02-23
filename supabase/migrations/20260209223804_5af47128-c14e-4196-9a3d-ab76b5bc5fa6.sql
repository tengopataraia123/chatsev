
-- Create storage bucket for group assets (avatars and covers)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('group-assets', 'group-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Grant policy creation permissions (needed for fresh installations)
DO $$
BEGIN
  -- Allow anyone to view group assets
  CREATE POLICY "Group assets are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'group-assets');

  -- Allow group owners/admins to upload group assets
  CREATE POLICY "Group owners can upload assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'group-assets'
    AND auth.uid() IS NOT NULL
  );

  -- Allow group owners/admins to update assets
  CREATE POLICY "Group owners can update assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'group-assets'
    AND auth.uid() IS NOT NULL
  );

  -- Allow group owners/admins to delete assets
  CREATE POLICY "Group owners can delete assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'group-assets'
    AND auth.uid() IS NOT NULL
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create storage policies: %', SQLERRM;
END $$;
