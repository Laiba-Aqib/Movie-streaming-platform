const { connectDB, closeDB } = require('../config/database');

// Generate random date within last N days
function randomDateWithinDays(days) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime);
}

// Generate random watch duration (30-180 minutes)
function randomDuration() {
  return Math.floor(Math.random() * 151) + 30;
}

async function seedWatchHistory() {
  try {
    console.log('🌱 Seeding watch history...');
    const db = await connectDB();
    
    // Get all users and movies
    const users = await db.collection('users').find({}).toArray();
    const movies = await db.collection('movies').find({}).limit(100).toArray();
    
    if (users.length === 0) {
      console.log('⚠️  No users found. Please run seedUsers.js first!');
      return;
    }
    
    if (movies.length === 0) {
      console.log('⚠️  No movies found. Please import movies first!');
      return;
    }
    
    console.log(`📊 Found ${users.length} users and ${movies.length} movies`);
    
    // Clear existing watch history
    await db.collection('watch_history').deleteMany({});
    console.log('✅ Cleared existing watch history');
    
    // Generate watch history (each user watches 5-15 random movies)
    const watchHistory = [];
    
    for (const user of users) {
      const numWatches = Math.floor(Math.random() * 11) + 5; // 5-15 watches
      const watchedMovies = new Set();
      
      for (let i = 0; i < numWatches; i++) {
        // Pick a random movie (avoid duplicates for same user)
        let randomMovie;
        let attempts = 0;
        do {
          randomMovie = movies[Math.floor(Math.random() * movies.length)];
          attempts++;
        } while (watchedMovies.has(randomMovie._id.toString()) && attempts < 10);
        
        if (attempts >= 10) break; // Avoid infinite loop
        
        watchedMovies.add(randomMovie._id.toString());
        
        watchHistory.push({
          user_id: user._id,
          movie_id: randomMovie._id,
          watched_at: randomDateWithinDays(60), // Last 60 days
          watch_duration: randomDuration()
        });
      }
    }
    
    // Insert watch history
    const result = await db.collection('watch_history').insertMany(watchHistory);
    console.log(`✅ Inserted ${result.insertedCount} watch history records`);
    
    // Show statistics
    const stats = await db.collection('watch_history')
      .aggregate([
        {
          $group: {
            _id: null,
            total_watches: { $sum: 1 },
            total_duration: { $sum: '$watch_duration' },
            unique_users: { $addToSet: '$user_id' },
            unique_movies: { $addToSet: '$movie_id' }
          }
        }
      ])
      .toArray();
    
    if (stats.length > 0) {
      console.log('\n📊 Watch History Statistics:');
      console.log(`   - Total watches: ${stats[0].total_watches}`);
      console.log(`   - Total watch time: ${stats[0].total_duration} minutes`);
      console.log(`   - Unique users: ${stats[0].unique_users.length}`);
      console.log(`   - Unique movies: ${stats[0].unique_movies.length}`);
    }
    
    console.log('\n✨ Watch history seeding completed!');
    
  } catch (error) {
    console.error('❌ Error seeding watch history:', error);
  } finally {
    await closeDB();
  }
}

// Run if called directly
if (require.main === module) {
  seedWatchHistory();
}

module.exports = seedWatchHistory;