const fs = require('fs');
const path = require('path');

// Load environment from backend
require('dotenv').config({ path: path.join(__dirname, 'js-implementation/Backend/nodejs/.env') });

const mysql = require('mysql2/promise');

const seedData = async () => {
    let connection;
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('Connected to MySQL');

        // Read schema
        const fs = require('fs');
        const schema = fs.readFileSync('./database/schema.sql', 'utf8');
        const seed = fs.readFileSync('./database/seed.sql', 'utf8');

        // Execute schema
        console.log('Creating database and tables...');
        await connection.query(schema);
        console.log('✓ Database schema created');

        // Execute seed
        console.log('Seeding test data...');
        await connection.query(seed);
        console.log('✓ Database seeded successfully');

        // Verify data
        console.log('\nVerifying seeded data...');
        const [users] = await connection.query('SELECT userEmail FROM users');
        console.log(`Found ${users.length} users:`);
        users.forEach(user => {
            console.log(`  - ${user.userEmail}`);
        });

        console.log('\n=== DATABASE SETUP COMPLETE ===\n');
        console.log('Test Credentials:');
        console.log('  Email: alice@demo.com');
        console.log('  Password: Password123!');
        console.log('\n  Email: bob@demo.com');
        console.log('  Password: Password123!');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        console.error('\nMake sure:');
        console.error('1. MySQL is running');
        console.error('2. Credentials in .env are correct');
        console.error('3. You have proper permissions');
        process.exit(1);
    }
};

seedData();
