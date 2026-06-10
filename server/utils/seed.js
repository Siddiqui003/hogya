/**
 * Seed script — run once to bootstrap an admin user and sample accounts.
 *
 * Usage:
 *   cd server
 *   node utils/seed.js
 *
 * Set MONGODB_URI in server/.env before running.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const USERS = [
  {
    username: 'admin',
    password: 'admin123',
    displayName: 'Administrator',
    role: 'admin',
  },
  {
    username: 'alice',
    password: 'alice123',
    displayName: 'Alice',
    role: 'user',
  },
  {
    username: 'bob',
    password: 'bob123',
    displayName: 'Bob',
    role: 'user',
  },
  {
    username: 'carol',
    password: 'carol123',
    displayName: 'Carol',
    role: 'user',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const userData of USERS) {
      const exists = await User.findOne({ username: userData.username });
      if (exists) {
        console.log(`⚠️  User "${userData.username}" already exists — skipping`);
        continue;
      }
      const user = await User.create(userData);
      console.log(`✅ Created ${user.role}: ${user.username} (password: ${userData.password})`);
    }

    console.log('\n🌱 Seed complete.');
    console.log('   Admin login → username: admin | password: admin123');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seed();
