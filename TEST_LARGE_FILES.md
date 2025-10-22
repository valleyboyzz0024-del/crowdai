# Testing Large File Upload Fix - Step-by-Step Guide

## ✅ Build Status: PASSED
The code compiles successfully with no errors.

## Prerequisites

Before testing, ensure:
- ✅ Backend server is running (`npm run dev` in Chat directory)
- ✅ MongoDB is connected
- ✅ Supabase credentials are in `.env`
- ✅ You have your `todo.zip` (159MB) ready
- ✅ You're logged into the app

## Test Scenarios

### Test 1: Original Issue - 159MB ZIP File

**Expected Behavior**: Should show clear error message since 159MB is under the 200MB limit but might timeout.

**Steps**:
1. Open the app in browser (http://localhost:3000)
2. Log in to your account
3. Click the paperclip 📎 icon
4. Select `todo.zip` (159MB)
5. Wait for upload progress bar
6. Type a message: "analyze this project"
7. Click Send

**Expected Results**:
- ✅ Upload progress shows (green bar)
- ✅ File uploaded to Supabase successfully
- ⚠️ When you click Send, you'll see:
  - Either: Processing for 30-60 seconds, then AIs receive content
  - Or: Clear error message: "Failed to process todo.zip: ZIP file is too large..."
- ❌ NO MORE "undefined" messages from AIs
- ❌ NO MORE silent failures

**Console Logs to Check**:
```
📥 Processing Supabase file: {userId}/1234567890_todo.zip
📥 Downloading from Supabase: {userId}/1234567890_todo.zip
✅ Downloaded todo.zip (159.43 MB)
❌ ZIP file too large: 159.43 MB
```

---

### Test 2: Small ZIP File (< 10MB)

**Expected Behavior**: Should process instantly locally (no Supabase upload).

**Steps**:
1. Create a small test ZIP:
   - Create a folder with 5-10 text files
   - ZIP it (should be < 10MB)
2. Upload the small ZIP
3. Type: "what files are in here?"
4. Click Send

**Expected Results**:
- ✅ Instant processing (< 1 second)
- ✅ All AIs receive file list
- ✅ File contents displayed in message

**Console Logs**:
```
📦 Extracted 10 files from test.zip
```

---

### Test 3: Medium ZIP File (10-50MB)

**Expected Behavior**: Should upload to Supabase, then download and extract successfully.

**Steps**:
1. Create a medium test ZIP (20-30MB):
   - Add more files or larger files to a folder
   - ZIP it
2. Upload the medium ZIP
3. Type: "summarize this project"
4. Click Send

**Expected Results**:
- ✅ Upload progress bar shows
- ✅ Processing takes 15-35 seconds
- ✅ All AIs receive extracted content
- ✅ File deleted from Supabase after processing

**Console Logs**:
```
📤 Uploading large file to Supabase: test.zip (25.43 MB)
✅ Upload complete: {userId}/1234567890_test.zip
📥 Processing Supabase file: {userId}/1234567890_test.zip
📥 Downloading from Supabase: {userId}/1234567890_test.zip
✅ Downloaded test.zip (25.43 MB)
📦 Extracting ZIP file: test.zip (25.43 MB)
✅ Extracted 50 files from ZIP (23.12 MB total)
```

---

### Test 4: Image Files

**Expected Behavior**: Only Claude and ChatGPT respond to images.

**Steps**:
1. Upload a PNG or JPG image
2. Type: "what's in this image?"
3. Click Send

**Expected Results**:
- ✅ Claude responds with image analysis
- ✅ ChatGPT responds with image analysis
- ✅ Other AIs remain silent (no "I can't view images" spam)

---

### Test 5: Mixed Files (Images + Code)

**Expected Behavior**: All AIs get code, only Claude/ChatGPT see images.

**Steps**:
1. Create a ZIP with:
   - 5 code files (.js, .py, .html)
   - 2 images (.png, .jpg)
2. Upload the ZIP
3. Type: "analyze this project and describe the images"
4. Click Send

**Expected Results**:
- ✅ All AIs receive and analyze code files
- ✅ Claude mentions images
- ✅ ChatGPT mentions images
- ✅ Gemini/Llama/DeepSeek/Grok only discuss code

---

## Testing the Error Handling

### Test 6: Verify Error Message Display

If your 159MB file is rejected, you should see:

**Browser Alert**:
```
Failed to process todo.zip: ZIP file is too large (159.43 MB). 
Maximum size for extraction is 200 MB. 
Please upload smaller files or break them into multiple uploads.
```

**Browser Console**:
```
❌ Error processing Supabase file: ZIP file is too large...
```

**Backend Logs**:
```
📥 Downloading from Supabase: {userId}/1234567890_todo.zip
✅ Downloaded todo.zip (159.43 MB)
❌ ZIP file too large: 159.43 MB
```

---

## If Tests Fail

### Issue: File still shows "undefined"

**Check**:
1. Is backend server running?
2. Are Supabase credentials correct in `.env`?
3. Check browser console for JavaScript errors
4. Check backend logs for server errors

### Issue: Upload stuck at 100%

**Solution**:
- Refresh the page
- Try a smaller file first
- Check network tab in browser DevTools

### Issue: "Download timeout after 2 minutes"

**Solution**:
- File is too large for current setup
- Split into smaller ZIPs (50-100MB each)
- Or use the "split file" method in LARGE_FILE_HANDLING.md

---

## Splitting Your 159MB File (If Needed)

### On Windows (using 7-Zip):
```bash
# Install 7-Zip first: https://www.7-zip.org/
7z a -v100m todo_part.zip todo.zip
```

This creates:
- `todo_part.zip.001` (100MB)
- `todo_part.zip.002` (59MB)

### On Mac/Linux:
```bash
split -b 100m todo.zip todo_part_
```

This creates:
- `todo_part_aa` (100MB)
- `todo_part_ab` (59MB)

Then upload each part separately.

---

## Success Criteria

✅ **All tests should show**:
1. No "undefined" messages from AIs
2. Clear error messages when files are too large
3. Successful processing for files < 50MB
4. Vision routing works (Claude/ChatGPT only for images)
5. All AIs receive text/code content

---

## Manual Test Checklist

- [ ] Test 1: 159MB ZIP (verify error handling)
- [ ] Test 2: Small ZIP < 10MB (verify local processing)
- [ ] Test 3: Medium ZIP 10-50MB (verify Supabase processing)
- [ ] Test 4: Single image (verify vision routing)
- [ ] Test 5: Mixed content ZIP (verify content separation)
- [ ] Test 6: Error message display (verify user feedback)

---

## Deployment Testing (After Vercel Deploy)

After deploying to Vercel:

1. **Verify Environment Variables**:
   - Check Vercel dashboard for `SUPABASE_URL`
   - Check `SUPABASE_SERVICE_KEY`
   - Verify MongoDB connection string

2. **Test on Production**:
   - Use same test scenarios
   - Note: Vercel Hobby plan has 60s timeout
   - Files > 100MB may timeout on Vercel

3. **Monitor Logs**:
   ```bash
   vercel logs --follow
   ```

---

## Contact Support

If you encounter issues:
1. Check browser console for errors
2. Check backend logs for server errors
3. Verify all environment variables are set
4. Try splitting the file if it's > 100MB
5. Report the specific error message you see