const { connectDB, closeDB } = require('../config/database');

const sampleUsers = [
  {
    name: 'Alice Johnson',
    email: 'alice.johnson@email.com',
    subscription_type: 'premium',
    created_at: new Date('2024-01-15')
  },
  {
    name: 'Bob Smith',
    email: 'bob.smith@email.com',
    subscription_type: 'basic',
    created_at: new Date('2024-02-20')
  },
  {
    name: 'Carol White',
    email: 'carol.white@email.com',
    subscription_type: 'vip',
    created_at: new Date('2024-03-10')
  },
  {
    name: 'David Brown',
    email: 'david.brown@email.com',
    subscription_type: 'premium',
    created_at: new Date('2024-04-05')
  },
  {
    name: 'Emma Davis',
    email: 'emma.davis@email.com',
    subscription_type: 'basic',
    created_at: new Date('2024-05-12')
  },
  {
    name: 'Frank Miller',
    email: 'frank.miller@email.com',
    subscription_type: 'premium',
    created_at: new Date('2024-06-18')
  },
  {
    name: 'Grace Wilson',
    email: 'grace.wilson@email.com',
    subscription_type: 'vip',
    created_at: new Date('2024-07-22')
  },
  {
    name: 'Henry Moore',
    email: 'henry.moore@email.com',
    subscription_type: 'basic',
    created_at: new Date('2024-08-14')
  },
  {
    name: 'Isabel Taylor',
    email: 'isabel.taylor@email.com',
    subscription_type: 'premium',
    created_at: new Date('2024-09-01')
  },
  {
    name: 'Jack Anderson',
    email: 'jack.anderson@email.com',
    subscription_type: 'basic',
    created_at: new Date('2024-09-25')
  }
];

async function seedUsers() {
  try {
    const db = await connectDB();

    await db.collection('users').deleteMany({});
    console.log('Cleared existing users');

    const result = await db.collection('users').insertMany(sampleUsers);
    console.log(`Inserted ${result.insertedCount} users`);

    const users = await db.collection('users').find({}).toArray();
    console.log('Sample Users:');
    users.forEach(user => {
      console.log(`- ${user.name} (${user.subscription_type}) - ID: ${user._id}`);
    });

    console.log('User seeding completed.');
  } catch (error) {
    console.error('Error seeding users:', error);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  seedUsers();
}

module.exports = seedUsers;
