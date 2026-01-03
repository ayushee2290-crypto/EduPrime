const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Create direct pool connection for seeding
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eduprime',
    user: process.env.DB_USER || 'eduprime_user',
    password: process.env.DB_PASSWORD || 'eduprime_secure_pass_2026',
    max: 5,
    connectionTimeoutMillis: 5000,
});

const seedUsers = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Default users to create
    const users = [
      {
        email: 'admin@eduprime.edu',
        phone: '9876543210',
        password: 'Admin@123',
        role: 'admin'
      },
      {
        email: 'operator@eduprime.edu',
        phone: '9876543211',
        password: 'Operator@123',
        role: 'manager'  // Using manager role as operator
      }
    ];
    
    console.log('Creating default users...\n');
    
    for (const user of users) {
      // Check if user exists
      const existing = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [user.email]
      );
      
      if (existing.rows.length > 0) {
        // Update password for existing user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(user.password, salt);
        
        await client.query(
          'UPDATE users SET password_hash = $1, role = $2, updated_at = NOW() WHERE email = $3',
          [passwordHash, user.role, user.email]
        );
        console.log(`✅ Updated: ${user.role.toUpperCase()}`);
      } else {
        // Create new user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(user.password, salt);
        
        await client.query(
          `INSERT INTO users (email, phone, password_hash, role)
           VALUES ($1, $2, $3, $4)`,
          [user.email, user.phone, passwordHash, user.role]
        );
        console.log(`✅ Created: ${user.role.toUpperCase()}`);
      }
      
      console.log(`   Email: ${user.email}`);
      console.log(`   Password: ${user.password}`);
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  ADMIN USER                                         │');
    console.log('│  ─────────────                                      │');
    console.log('│  Email:    admin@eduprime.edu                       │');
    console.log('│  Password: Admin@123                                │');
    console.log('│  Role:     Full access to all features              │');
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│  OPERATOR USER                                      │');
    console.log('│  ──────────────                                     │');
    console.log('│  Email:    operator@eduprime.edu                    │');
    console.log('│  Password: Operator@123                             │');
    console.log('│  Role:     Limited access (no settings/reports)     │');
    console.log('└─────────────────────────────────────────────────────┘');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedUsers;
