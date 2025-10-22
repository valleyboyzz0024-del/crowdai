import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { makeLimiter, with429Retry, logRateLimitHeaders } from './utils/limiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory (Chat/.env)
dotenv.config({ path: join(__dirname, '..', '.env') });

// Verify critical env vars are loaded
console.log('🔍 [ENV] Checking environment variables...');
if (!process.env.JWT_SECRET) {
  console.error('❌ [ENV] JWT_SECRET not found!');
} else {
  console.log('✅ [ENV] JWT_SECRET loaded');
}

import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chats.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import { authenticate, checkQueryLimit, checkAIAccess } from './middleware/auth.js';

// Create rate limiter for ChatGPT (pace ~4 requests/sec, single flight)
const chatgptLimiter = makeLimiter({
  minIntervalMs: 250,     // ~4 requests per second
  maxConcurrency: 1       // No concurrent bursts
});

// Connect to MongoDB
connectDB();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Diagnostic endpoint for production debugging
app.get('/api/_diag/auth', (req, res) => {
  res.json({
    hasJsonParser: true,
    mongoState: require('mongoose').connection.readyState,
    jwtSecret: !!process.env.JWT_SECRET,
    refreshSecret: !!(process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET),
    hasMongoUri: !!process.env.MONGODB_URI,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Chat history routes
app.use('/api/chats', chatRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Supabase file upload endpoint
app.post('/api/upload-to-supabase', authenticate, async (req, res) => {
  try {
    const multer = (await import('multer')).default;
    const { createClient } = await import('@supabase/supabase-js');
    
    // Configure multer for memory storage
    const upload = multer({ storage: multer.memoryStorage() }).single('file');
    
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'File upload failed' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }
      
      try {
        // Initialize Supabase client
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${req.user._id}/${timestamp}_${sanitizedName}`;
        
        console.log(`📤 Uploading to Supabase: ${fileName} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('crowdai-uploads')
          .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });
        
        if (error) {
          console.error('Supabase upload error:', error);
          return res.status(500).json({ error: error.message });
        }
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('crowdai-uploads')
          .getPublicUrl(fileName);
        
        console.log(`✅ Upload successful: ${fileName}`);
        
        res.json({
          success: true,
          fileName: fileName,
          supabaseUrl: urlData.publicUrl,
          size: req.file.size,
          type: req.file.mimetype
        });
      } catch (error) {
        console.error('Upload processing error:', error);
        res.status(500).json({ error: 'Failed to process upload' });
      }
    });
  } catch (error) {
    console.error('Upload endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process file from Supabase endpoint
app.post('/api/process-supabase-file', authenticate, async (req, res) => {
  // Set extended timeout for large files (5 minutes)
  req.setTimeout(300000);
  res.setTimeout(300000);
  
  try {
    const { fileName } = req.body;
    const { createClient } = await import('@supabase/supabase-js');
    
    if (!fileName) {
      return res.status(400).json({ success: false, error: 'No fileName provided' });
    }
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log(`📥 Downloading from Supabase: ${fileName}`);
    
    // Download file from Supabase with timeout
    const downloadPromise = supabase.storage
      .from('crowdai-uploads')
      .download(fileName);
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Download timeout after 2 minutes')), 120000)
    );
    
    const { data, error } = await Promise.race([downloadPromise, timeoutPromise]);
    
    if (error) {
      console.error('Supabase download error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    if (!data) {
      return res.status(500).json({ success: false, error: 'No data received from Supabase' });
    }
    
    console.log(`✅ Downloaded ${fileName} (${(data.size / 1024 / 1024).toFixed(2)} MB)`);
    
    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer());
    
    // Check if it's a ZIP file
    if (fileName.endsWith('.zip')) {
      // Check size limit - 50MB max for Vercel's 10-second timeout
      const sizeMB = buffer.length / 1024 / 1024;
      if (sizeMB > 50) {
        console.error(`❌ ZIP file too large for Vercel: ${sizeMB.toFixed(2)} MB`);
        
        // Delete file from Supabase
        await supabase.storage
          .from('crowdai-uploads')
          .remove([fileName]);
        
        return res.status(413).json({
          success: false,
          error: `ZIP file is too large (${sizeMB.toFixed(2)} MB). Vercel serverless functions have a 10-second timeout. Maximum size is 50 MB. Please split your file into smaller ZIPs:\n\nWindows: 7z a -v50m output.zip largefile.zip\nMac/Linux: split -b 50m largefile.zip part_`
        });
      }
      
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      console.log(`📦 Extracting ZIP file: ${fileName} (${sizeMB.toFixed(2)} MB)`);
      
      const zipContent = await zip.loadAsync(buffer);
      const extractedFiles = [];
      let totalSize = 0;
      
      for (const [filename, zipFile] of Object.entries(zipContent.files)) {
        if (!zipFile.dir) {
          try {
            // Skip binary files that are too large
            if (zipFile._data && zipFile._data.uncompressedSize > 5 * 1024 * 1024) {
              console.warn(`⚠️ Skipping large file ${filename} (${(zipFile._data.uncompressedSize / 1024 / 1024).toFixed(2)} MB)`);
              continue;
            }
            
            const content = await zipFile.async('string');
            totalSize += content.length;
            
            // Limit total extracted content to 50MB to prevent memory issues
            if (totalSize > 50 * 1024 * 1024) {
              console.warn(`⚠️ Stopping extraction - total size limit reached (50 MB)`);
              break;
            }
            
            extractedFiles.push({
              name: filename,
              content: content.substring(0, 100000), // Limit each file to 100KB
              size: content.length
            });
          } catch (err) {
            console.warn(`⚠️ Could not extract ${filename}:`, err.message);
          }
        }
      }
      
      console.log(`✅ Extracted ${extractedFiles.length} files from ZIP (${(totalSize / 1024 / 1024).toFixed(2)} MB total)`);
      
      // Delete file from Supabase after processing
      await supabase.storage
        .from('crowdai-uploads')
        .remove([fileName]);
      
      res.json({
        success: true,
        type: 'zip',
        filesCount: extractedFiles.length,
        files: extractedFiles
      });
    } else {
      // For other files, return content
      const content = buffer.toString('utf-8');
      
      // Delete file from Supabase after processing
      await supabase.storage
        .from('crowdai-uploads')
        .remove([fileName]);
      
      res.json({
        success: true,
        type: 'file',
        content: content,
        size: buffer.length
      });
    }
  } catch (error) {
    console.error('❌ File processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Firecrawl search endpoint
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
      },
      body: JSON.stringify({
        query: query,
        limit: 5
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Firecrawl Search Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Claude API endpoint with tool use and vision
app.post('/api/claude', authenticate, checkQueryLimit, checkAIAccess('claude'), async (req, res) => {
  try {
    const { messages, images, temperature = 0.7, system } = req.body;
    
    console.log('🤖 [CLAUDE] Request received');
    console.log(`📨 [CLAUDE] Processing ${messages.length} message(s)`);
    if (images && images.length > 0) {
      console.log(`🖼️ [CLAUDE] Processing ${images.length} image(s)`);
    }
    
    // Format messages for Claude with vision support
    let formattedMessages = messages.map((msg, idx) => {
      if (idx === messages.length - 1 && images && images.length > 0) {
        // Last message with images - use content blocks
        const content = [
          { type: 'text', text: msg.content }
        ];
        
        // Add images
        for (const imageData of images) {
          // Extract base64 and media type
          const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mediaType = match[1];
            const base64Data = match[2];
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data
              }
            });
          }
        }
        
        return { role: msg.role, content };
      }
      return msg;
    });
    
    const tools = [{
      name: 'web_search',
      description: 'Search the web for current information, news, facts, or any data you need. Use this when you need up-to-date information or want to verify facts.',
      input_schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up on the web'
          }
        },
        required: ['query']
      }
    }, {
      name: 'generate_image',
      description: 'Generate an image using Leonardo AI based on a text description. Use this when the user asks you to create, generate, or make an image.',
      input_schema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'A detailed description of the image to generate'
          }
        },
        required: ['prompt']
      }
    }];
    
    let currentMessages = formattedMessages;
    let continueLoop = true;
    
    while (continueLoop) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: currentMessages,
          tools: tools,
          temperature: temperature,
          ...(system && { system: system })
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      
      // Check if Claude wants to use a tool
      if (data.stop_reason === 'tool_use') {
        const toolUse = data.content.find(block => block.type === 'tool_use');
        
        if (toolUse && toolUse.name === 'web_search') {
          // Perform the search
          const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
              query: toolUse.input.query,
              limit: 5
            })
          });
          
          const searchData = await searchResponse.json();
          
          // Format search results
          let searchResults = 'Search results:\n\n';
          if (searchData.data && searchData.data.length > 0) {
            searchData.data.forEach((result, index) => {
              searchResults += `${index + 1}. ${result.title}\n`;
              searchResults += `   URL: ${result.url}\n`;
              searchResults += `   ${result.description || result.content?.substring(0, 200) || ''}\n\n`;
            });
          } else {
            searchResults = 'No search results found.';
          }
          
          // Add assistant message with tool use
          currentMessages.push({
            role: 'assistant',
            content: data.content
          });
          
          // Add tool result
          currentMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: searchResults
            }]
          });
          
          // Continue the loop to get Claude's final response
          continue;
        } else if (toolUse && toolUse.name === 'generate_image') {
          // Generate image with Leonardo AI
          console.log('🎨 Starting image generation with prompt:', toolUse.input.prompt);
          
          const generateResponse = await fetch('https://cloud.leonardo.ai/api/rest/v1/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
            },
            body: JSON.stringify({
              prompt: toolUse.input.prompt,
              num_images: 1,
              width: 1024,
              height: 1024,
              modelId: '6b645e3a-d64f-4341-a6d8-7a3690fbf042' // Leonardo Phoenix model
            })
          });
          
          console.log('📡 Leonardo API response status:', generateResponse.status);
          const generateData = await generateResponse.json();
          console.log('📦 Leonardo API response data:', JSON.stringify(generateData, null, 2));
          
          if (!generateData.sdGenerationJob || !generateData.sdGenerationJob.generationId) {
            // Add assistant message with tool use
            currentMessages.push({
              role: 'assistant',
              content: data.content
            });
            
            // Add error result
            currentMessages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: 'Failed to start image generation.'
              }]
            });
            continue;
          }
          
          const generationId = generateData.sdGenerationJob.generationId;
          console.log('🔑 Generation ID:', generationId);
          
          // Poll for completion (wait up to 30 seconds)
          let imageUrl = null;
          for (let i = 0; i < 15; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
            console.log(`⏱️  Polling attempt ${i + 1}/15...`);
            
            const statusResponse = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
              headers: {
                'Authorization': `Bearer ${process.env.LEONARDO_API_KEY}`
              }
            });
            
            const statusData = await statusResponse.json();
            console.log('📊 Status:', statusData.generations_by_pk?.status);
            
            if (statusData.generations_by_pk && statusData.generations_by_pk.status === 'COMPLETE') {
              if (statusData.generations_by_pk.generated_images && statusData.generations_by_pk.generated_images.length > 0) {
                imageUrl = statusData.generations_by_pk.generated_images[0].url;
                console.log('✅ Image URL:', imageUrl);
              }
              break;
            }
          }
          
          // Add assistant message with tool use
          currentMessages.push({
            role: 'assistant',
            content: data.content
          });
          
          // Add tool result with image URL
          const resultMessage = imageUrl ? `Image generated successfully: ${imageUrl}` : 'Image generation timed out. Please try again.';
          console.log('📤 Sending result to Claude:', resultMessage);
          
          currentMessages.push({
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultMessage
            }]
          });
          
          // Continue the loop to get Claude's final response
          continue;
        }
      }
      
      // No more tool use, return the response
      continueLoop = false;
      res.json(data);
    }
  } catch (error) {
    console.error('Claude API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ChatGPT API endpoint with vision and streaming
app.post('/api/chatgpt', authenticate, checkQueryLimit, checkAIAccess('chatgpt'), async (req, res) => {
  try {
    const { messages, images, stream = false, temperature = 0.7 } = req.body;
    
    console.log('🤖 [CHATGPT] Request received');
    console.log(`📨 [CHATGPT] Processing ${messages.length} message(s)`);
    if (images && images.length > 0) {
      console.log(`🖼️ [CHATGPT] Processing ${images.length} image(s)`);
    }
    
    // Format messages for OpenAI with vision support
    const formattedMessages = messages.map((msg, idx) => {
      if (idx === messages.length - 1 && images && images.length > 0) {
        // Last message with images - use content array
        const content = [
          { type: 'text', text: msg.content }
        ];
        
        // Add images
        for (const imageData of images) {
          content.push({
            type: 'image_url',
            image_url: {
              url: imageData
            }
          });
        }
        
        return { role: msg.role, content };
      }
      return msg;
    });
    
    // Use rate limiter with 429 retry logic
    const response = await chatgptLimiter(() =>
      with429Retry(() =>
        fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4.1',
            messages: formattedMessages,
            max_tokens: 1024,
            stream: stream,
            temperature: temperature
          })
        })
      )
    );
    
    // Log rate limit info for monitoring
    logRateLimitHeaders(response, 'ChatGPT');
    
    if (!response.ok) {
      const status = response.status;
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: await response.text() };
      }
      
      // Enhanced 429 error handling
      if (status === 429) {
        console.error('❌ [CHATGPT] Rate limit exceeded after retries');
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'ChatGPT is experiencing high demand. Please wait a moment and try again.',
          retryAfter: response.headers.get('retry-after'),
          details: errorData
        });
      }
      
      return res.status(status).json(errorData);
    }

    if (stream) {
      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Validate response body exists
      if (!response.body) {
        console.error('❌ [CHATGPT] Response body is null or undefined');
        res.write(`data: ${JSON.stringify({
          error: 'Streaming failed: No response body from OpenAI API'
        })}\n\n`);
        res.end();
        return;
      }

      // Set up timeout for stream (60 seconds)
      const streamTimeout = setTimeout(() => {
        console.error('⏱️ [CHATGPT] Stream timeout after 60 seconds');
        res.write(`data: ${JSON.stringify({
          error: 'Streaming timeout: Response took too long'
        })}\n\n`);
        res.end();
      }, 60000);

      let hasError = false;

      try {
        console.log('📡 [CHATGPT] Starting stream...');
        
        // node-fetch uses Node.js stream events, not browser ReadableStream API
        response.body.on('data', (chunk) => {
          if (hasError) return;
          
          try {
            const text = chunk.toString();
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                // Validate it's proper JSON before sending
                if (line.includes('[DONE]')) {
                  res.write(`${line}\n\n`);
                } else {
                  try {
                    const jsonStr = line.substring(6); // Remove 'data: ' prefix
                    JSON.parse(jsonStr); // Validate JSON
                    res.write(`${line}\n\n`);
                  } catch (jsonError) {
                    console.warn('⚠️ [CHATGPT] Invalid JSON in stream:', line);
                  }
                }
              }
            }
          } catch (chunkError) {
            console.error('❌ [CHATGPT] Error processing chunk:', chunkError);
          }
        });

        response.body.on('end', () => {
          clearTimeout(streamTimeout);
          if (!hasError) {
            console.log('✅ [CHATGPT] Stream completed successfully');
            res.end();
          }
        });

        response.body.on('error', (err) => {
          hasError = true;
          clearTimeout(streamTimeout);
          console.error('❌ [CHATGPT] Stream error:', err.message);
          console.error('Stack trace:', err.stack);
          
          // Send error to client in SSE format
          res.write(`data: ${JSON.stringify({
            error: `Stream error: ${err.message}`
          })}\n\n`);
          res.end();
        });

      } catch (streamError) {
        hasError = true;
        clearTimeout(streamTimeout);
        console.error('❌ [CHATGPT] Streaming setup error:', streamError.message);
        console.error('Stack trace:', streamError.stack);
        
        res.write(`data: ${JSON.stringify({
          error: `Streaming setup failed: ${streamError.message}`
        })}\n\n`);
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('ChatGPT API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Gemini API endpoint
app.post('/api/gemini', authenticate, checkQueryLimit, checkAIAccess('gemini'), async (req, res) => {
  try {
    const { contents } = req.body;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || 'gemini-2.5-pro'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: contents
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Llama 3.3 API endpoint (via Together AI)
app.post('/api/llama', authenticate, checkQueryLimit, checkAIAccess('llama'), async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await fetch('https://api.together.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
        messages: messages,
        max_tokens: 1024
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Together AI (Llama 3.3) API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Groq-Llama API endpoint (Llama 4 Scout via Groq)
app.post('/api/groq', authenticate, checkQueryLimit, checkAIAccess('groq'), async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 1024,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Groq-Llama API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DeepSeek Chat V3 API endpoint (via OpenRouter)
app.post('/api/o1', authenticate, checkQueryLimit, checkAIAccess('deepseek'), async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Group Chat'
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat-v3-0324',
        messages: messages,
        max_tokens: 1024
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('DeepSeek Chat V3 API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Grok-4 API endpoint (via xAI)
app.post('/api/grok', authenticate, checkQueryLimit, checkAIAccess('grok'), async (req, res) => {
  try {
    const { messages } = req.body;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.XAI_MODEL || 'grok-4-fast-reasoning',
        messages: messages,
        max_tokens: 1024
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Grok-4 API Error:', error);
    res.status(500).json({ error: error.message });
  }
});
// Code execution endpoint with Docker sandbox
const ALLOW_CODE_EXECUTION = process.env.ALLOW_CODE_EXECUTION === 'true' && !process.env.VERCEL;

app.post('/api/execute-code', authenticate, async (req, res) => {
  // Check if code execution is enabled
  if (!ALLOW_CODE_EXECUTION) {
    return res.status(503).json({
      success: false,
      error: 'Code execution disabled on this deployment',
      reason: 'Not available in serverless environment'
    });
  }
  
  // Check if user's tier allows code execution
  const limits = req.user.getTierLimits();
  if (!limits.codeExecution) {
    return res.status(403).json({
      success: false,
      error: 'Code execution requires Standard tier or higher',
      currentTier: req.user.tier,
      upgradeRequired: true
    });
  }
  
  try {
    const { code, language } = req.body;
    
    console.log(`🔧 [CODE EXECUTION] Request received for ${language}`);
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Missing code or language parameter' });
    }
    
    // Validate language
    const supportedLanguages = ['python', 'javascript', 'js'];
    if (!supportedLanguages.includes(language.toLowerCase())) {
      return res.status(400).json({
        error: `Unsupported language: ${language}. Supported: ${supportedLanguages.join(', ')}`
      });
    }

    // Try Docker execution first, fall back to local if Docker unavailable
    try {
      const Docker = (await import('dockerode')).default;
      const docker = new Docker();
      
      // Check if Docker is available
      await docker.ping();
      console.log('🐳 [DOCKER] Docker available, using containerized execution');
      
      const result = await executeInDockerContainer(docker, code, language);
      res.json(result);
    } catch (dockerError) {
      console.warn('⚠️ [DOCKER] Docker not available, falling back to local execution:', dockerError.message);
      
      // Fallback to local execution with enhanced security
      const result = await executeLocally(code, language);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ [CODE EXECUTION] Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Docker containerized execution
async function executeInDockerContainer(docker, code, language) {
  const fs = await import('fs');
  const path = await import('path');
  const tar = (await import('tar-stream')).pack();
  const timeoutMs = 30000; // 30 second timeout
  
  let imageName, fileName, command;
  
  if (language.toLowerCase() === 'python') {
    imageName = 'python:3.11-slim';
    fileName = 'script.py';
    // Add matplotlib and other common viz libraries
    const fullCode = `
import sys
import io
import json
import base64

# Capture stdout
original_stdout = sys.stdout
sys.stdout = io.StringIO()

# Add visualization support
has_matplotlib = False
try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend
    import matplotlib.pyplot as plt
    has_matplotlib = True
except ImportError:
    pass

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
    
    output = sys.stdout.getvalue()
    sys.stdout = original_stdout
    
    result = {'output': output, 'error': '', 'charts': []}
    
    # Check if any plots were created
    if has_matplotlib and plt.get_fignums():
        for i, fig_num in enumerate(plt.get_fignums()):
            fig = plt.figure(fig_num)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
            buf.seek(0)
            img_data = base64.b64encode(buf.read()).decode('utf-8')
            result['charts'].append({
                'type': 'image',
                'data': f'data:image/png;base64,{img_data}',
                'index': i
            })
            plt.close(fig)
    
    print(json.dumps(result))
except Exception as e:
    sys.stdout = original_stdout
    print(json.dumps({'output': '', 'error': str(e), 'charts': []}))
`;
    tar.entry({ name: fileName }, fullCode);
    command = ['python', fileName];
  } else {
    imageName = 'node:20-slim';
    fileName = 'script.js';
    tar.entry({ name: fileName }, code);
    command = ['node', fileName];
  }
  
  tar.finalize();
  
  try {
    // Create container with resource limits
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: command,
      HostConfig: {
        Memory: 512 * 1024 * 1024, // 512 MB limit
        MemorySwap: 512 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000, // 50% CPU
        NetworkMode: 'none', // No network access
        ReadonlyRootfs: false,
        AutoRemove: true
      },
      WorkingDir: '/workspace',
      AttachStdout: true,
      AttachStderr: true
    });
    
    // Upload code to container
    await container.putArchive(tar, { path: '/workspace' });
    
    // Start container with timeout
    await container.start();
    
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        container.stop().catch(() => {});
        reject(new Error('Execution timeout (30s)'));
      }, timeoutMs)
    );
    
    const execPromise = container.wait();
    
    await Promise.race([execPromise, timeoutPromise]);
    
    // Get logs
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      follow: false
    });
    
    const output = logs.toString('utf8');
    
    // Try to parse JSON output for Python with charts
    let result;
    try {
      if (language.toLowerCase() === 'python') {
        const parsed = JSON.parse(output.trim());
        result = {
          success: !parsed.error,
          output: parsed.output,
          error: parsed.error,
          charts: parsed.charts || [],
          language: language,
          sandboxed: true
        };
      } else {
        result = {
          success: true,
          output: output,
          error: '',
          language: language,
          sandboxed: true
        };
      }
    } catch {
      result = {
        success: true,
        output: output,
        error: '',
        language: language,
        sandboxed: true
      };
    }
    
    console.log('✅ [DOCKER] Execution successful');
    return result;
    
  } catch (error) {
    console.error('❌ [DOCKER] Execution failed:', error.message);
    return {
      success: false,
      error: error.message,
      language: language,
      sandboxed: true
    };
  }
}

// Local execution (fallback with basic security)
async function executeLocally(code, language) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const fs = await import('fs');
  const execAsync = promisify(exec);
  
  const timeoutMs = 10000; // 10 second timeout
  const tempFile = `.temp_${Date.now()}.${language === 'python' ? 'py' : 'js'}`;
  
  try {
    await fs.promises.writeFile(tempFile, code);
    
    const command = language === 'python' ? `python ${tempFile}` : `node ${tempFile}`;
    
    const { stdout, stderr } = await Promise.race([
      execAsync(command, {
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024 // 1MB buffer
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timeout (10s)')), timeoutMs)
      )
    ]);
    
    await fs.promises.unlink(tempFile).catch(() => {});
    
    console.log(`✅ [LOCAL] ${language.toUpperCase()} execution successful`);
    return {
      success: true,
      output: stdout,
      error: stderr,
      language: language,
      sandboxed: false
    };
  } catch (error) {
    await fs.promises.unlink(tempFile).catch(() => {});
    
    console.error(`❌ [LOCAL] ${language.toUpperCase()} execution failed:`, error.message);
    return {
      success: false,
      error: error.message,
      language: language,
      sandboxed: false
    };
  }
}


// Boot-time model validation
async function validateModels() {
  console.log('\n🔍 [VALIDATION] Checking AI model availability...\n');
  
  const results = {
    openai: false,
    anthropic: false,
    gemini: false,
    groq: false,
    together: false,
    xai: false
  };
  
  // OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    });
    if (response.ok) {
      const data = await response.json();
      const modelExists = data.data.some(m => m.id === process.env.OPENAI_MODEL);
      results.openai = modelExists;
      console.log(`${modelExists ? '✅' : '❌'} OpenAI: ${process.env.OPENAI_MODEL || 'gpt-4.1'}`);
      if (!modelExists) console.log(`   Available models: ${data.data.slice(0, 5).map(m => m.id).join(', ')}...`);
    }
  } catch (e) {
    console.log(`❌ OpenAI: ${e.message}`);
  }
  
  // Anthropic
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    if (response.ok) {
      const data = await response.json();
      const modelExists = data.data?.some(m => m.id === process.env.ANTHROPIC_MODEL);
      results.anthropic = !!modelExists;
      console.log(`${modelExists ? '✅' : '❌'} Anthropic: ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514'}`);
    }
  } catch (e) {
    console.log(`❌ Anthropic: ${e.message}`);
  }
  
  // Gemini (no listing API, just check key format)
  results.gemini = !!process.env.GEMINI_API_KEY;
  console.log(`${results.gemini ? '✅' : '❌'} Gemini: ${process.env.GEMINI_MODEL || 'gemini-2.5-pro'} (key ${results.gemini ? 'present' : 'missing'})`);
  
  // Groq
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
    });
    if (response.ok) {
      const data = await response.json();
      const modelExists = data.data?.some(m => m.id === process.env.GROQ_MODEL);
      results.groq = modelExists;
      console.log(`${modelExists ? '✅' : '❌'} Groq: ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
      if (!modelExists) console.log(`   Available: ${data.data?.slice(0, 5).map(m => m.id).join(', ')}...`);
    }
  } catch (e) {
    console.log(`❌ Groq: ${e.message}`);
  }
  
  // Together AI
  try {
    const response = await fetch('https://api.together.ai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}` }
    });
    if (response.ok) {
      const data = await response.json();
      const modelExists = Array.isArray(data?.data) && data.data.some(m => m.id === process.env.TOGETHER_MODEL);
      results.together = modelExists;
      console.log(`${modelExists ? '✅' : '❌'} Together: ${process.env.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'}`);
    }
  } catch (e) {
    console.log(`❌ Together AI: ${e.message}`);
  }
  
  // xAI (no public models endpoint, just check key)
  results.xai = !!process.env.XAI_API_KEY;
  console.log(`${results.xai ? '✅' : '❌'} xAI: ${process.env.XAI_MODEL || 'grok-4-fast-reasoning'} (key ${results.xai ? 'present' : 'missing'})`);
  
  console.log('\n' + '='.repeat(50));
  const allValid = Object.values(results).every(v => v);
  if (allValid) {
    console.log('✅ All AI providers validated successfully\n');
  } else {
    console.log('⚠️  Some providers failed validation - check logs above\n');
  }
  
  return results;
}

// Vercel-compatible export
export default app;

// Only start server in non-serverless environments
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    await validateModels();
  });
} else {
  // Run validation in serverless but don't block startup
  validateModels().catch(err => console.error('Validation error:', err));
}