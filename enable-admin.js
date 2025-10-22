/**
 * Script to enable admin access for rhroofer98@gmail.com
 * Run with: node enable-admin.js
 */

import mongoose from 'mongoose';
import User from './server/models/User.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ADMIN_EMAIL = 'rhroofer98@gmail.com';

async function enableAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found:', ADMIN_EMAIL);
      console.log('📝 Please create an account first, then run this script again.');
      process.exit(1);
    }
    
    console.log('👤 Found user:', user.email);
    console.log('   Current tier:', user.tier);
    console.log('   Current isAdmin:', user.isAdmin || false);
    
    // Update user to admin
    user.isAdmin = true;
    user.tier = 'enterprise'; // Admin should have enterprise tier
    
    await user.save();
    
    console.log('\n✅ SUCCESS! Admin access enabled for:', ADMIN_EMAIL);
    console.log('   New tier: ENTERPRISE');
    console.log('   isAdmin: true');
    console.log('\n📋 Admin features now available:');
    console.log('   ✓ Admin Panel button visible in header');
    console.log('   ✓ API Cost Tracker clickable');
    console.log('   ✓ User management');
    console.log('   ✓ Grant free trials');
    console.log('   ✓ View site statistics');
    console.log('\n🔄 Please refresh your browser to see changes.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

enableAdmin();