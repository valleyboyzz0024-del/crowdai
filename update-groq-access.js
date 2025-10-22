import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from Chat directory
dotenv.config({ path: join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = 'rhroofer98@gmail.com';

async function updateGroqAccess() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const users = db.collection('users');

    // Update admin user to enable groq
    const result = await users.updateOne(
      { email: ADMIN_EMAIL },
      {
        $set: {
          'enabledAIs.groq': true
        }
      }
    );

    if (result.matchedCount === 0) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`✅ Updated ${ADMIN_EMAIL} with Groq access enabled`);
    
    // Verify the update
    const user = await users.findOne({ email: ADMIN_EMAIL });
    console.log('\n📋 User enabledAIs:', user.enabledAIs);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

updateGroqAccess();