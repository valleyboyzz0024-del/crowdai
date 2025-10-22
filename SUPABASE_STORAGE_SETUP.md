# Supabase Storage Setup Guide

## Step 1: Access Your Supabase Project

1. Go to https://supabase.com/dashboard
2. Sign in with your account
3. Select your project: **lrcpvnylresrqtxvxcjc** (from your SUPABASE_URL in .env)

## Step 2: Create Storage Bucket

1. In the left sidebar, click **"Storage"**
2. Click the **"New bucket"** button (green button top-right)
3. Fill in the details:
   - **Name:** `crowdai-uploads`
   - **Public bucket:** Toggle **OFF** (keep it private for security)
   - **File size limit:** Leave empty or set to `5000` MB (5GB)
   - **Allowed MIME types:** Leave empty (allows all file types)
4. Click **"Create bucket"**

## Step 3: Configure Bucket Policies

1. Click on your new **crowdai-uploads** bucket
2. Click **"Policies"** tab at the top
3. Click **"New policy"** button
4. Select **"Custom policy"**

### Policy 1: Allow Authenticated Uploads
```sql
-- Name: Allow authenticated users to upload
-- Operation: INSERT

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'crowdai-uploads');
```

### Policy 2: Allow Authenticated Downloads
```sql
-- Name: Allow authenticated users to download
-- Operation: SELECT

CREATE POLICY "Allow authenticated downloads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'crowdai-uploads');
```

### Policy 3: Allow Service Role Full Access (for backend)
```sql
-- Name: Allow service role full access
-- Operation: ALL

CREATE POLICY "Allow service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'crowdai-uploads')
WITH CHECK (bucket_id = 'crowdai-uploads');
```

## Step 4: Verify Setup

1. Go back to **Storage** → **crowdai-uploads**
2. Try uploading a test file manually
3. If successful, you should see the file listed

## Step 5: Get Bucket URL (for verification)

Your bucket URL will be:
```
https://lrcpvnylresrqtxvxcjc.supabase.co/storage/v1/object/public/crowdai-uploads/
```

## Troubleshooting

**If uploads fail:**
- Check that bucket is created with name **exactly** as `crowdai-uploads`
- Verify all 3 policies are added
- Make sure you're using the SERVICE_ROLE key (not ANON key) for backend uploads

**If downloads fail:**
- Verify Policy 2 is created
- Check file permissions in bucket

---

## Once Complete

After you've completed these steps, let me know and I'll implement:
1. Frontend: Direct upload to Supabase with progress bar
2. Backend: Download from Supabase, extract ZIP, send to AIs
3. Support for unlimited file sizes

**Current Status:** ⏳ Waiting for Supabase bucket setup

---

## Notes

- Files are automatically deleted after processing (no storage costs)
- Only authenticated users can upload
- Backend uses service role for full access
- All file types supported (ZIP, images, videos, documents, etc.)