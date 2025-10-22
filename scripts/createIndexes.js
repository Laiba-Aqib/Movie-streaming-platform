const { connectDB, closeDB } = require('../config/database');

async function createIndexes() {
  try {
    console.log('📑 Creating database indexes...\n');
    const db = await connectDB();
    
    // ========== MOVIES COLLECTION ==========
    console.log('Creating indexes for movies collection...');
    
    // Text index for search (title, cast, directors)
    await db.collection('movies').createIndex(
      { 
        title: 'text', 
        cast: 'text', 
        directors: 'text' 
      },
      { 
        name: 'text_search_index',
        weights: {
          title: 10,
          cast: 5,
          directors: 5
        }
      }
    );
    console.log('✅ Text search index created');
    
    // Index for rating (for sorting by rating)
    await db.collection('movies').createIndex(
      { rating: -1 },
      { name: 'rating_index' }
    );
    console.log('✅ Rating index created');
    
    // Index for watch_count (for sorting by popularity)
    await db.collection('movies').createIndex(
      { watch_count: -1 },
      { name: 'watch_count_index' }
    );
    console.log('✅ Watch count index created');
    
    // Compound index for genres
    await db.collection('movies').createIndex(
      { genres: 1 },
      { name: 'genres_index' }
    );
    console.log('✅ Genres index created');
    
    // ========== USERS COLLECTION ==========
    console.log('\nCreating indexes for users collection...');
    
    // Unique index for email
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: 'email_unique_index' }
    );
    console.log('✅ Email unique index created');
    
    // Index for subscription type
    await db.collection('users').createIndex(
      { subscription_type: 1 },
      { name: 'subscription_index' }
    );
    console.log('✅ Subscription index created');
    
    // ========== WATCH_HISTORY COLLECTION ==========
    console.log('\nCreating indexes for watch_history collection...');
    
    // Compound index for user_id + watched_at (for user history queries)
    await db.collection('watch_history').createIndex(
      { user_id: 1, watched_at: -1 },
      { name: 'user_history_index' }
    );
    console.log('✅ User history index created');
    
    // Index for movie_id (for movie analytics)
    await db.collection('watch_history').createIndex(
      { movie_id: 1 },
      { name: 'movie_watch_index' }
    );
    console.log('✅ Movie watch index created');
    
    // Index for watched_at (for time-based queries)
    await db.collection('watch_history').createIndex(
      { watched_at: -1 },
      { name: 'watched_at_index' }
    );
    console.log('✅ Watched at index created');
    
    // ========== REVIEWS COLLECTION ==========
    console.log('\nCreating indexes for reviews collection...');
    
    // Compound unique index to prevent duplicate reviews (user + movie)
    await db.collection('reviews').createIndex(
      { user_id: 1, movie_id: 1 },
      { unique: true, name: 'unique_user_movie_review' }
    );
    console.log('✅ Unique user-movie review index created');
    
    // Index for movie_id + created_at (for movie reviews queries)
    await db.collection('reviews').createIndex(
      { movie_id: 1, created_at: -1 },
      { name: 'movie_reviews_index' }
    );
    console.log('✅ Movie reviews index created');
    
    // Index for rating (for analytics)
    await db.collection('reviews').createIndex(
      { rating: -1 },
      { name: 'rating_reviews_index' }
    );
    console.log('✅ Rating reviews index created');
    
    // ========== DISPLAY ALL INDEXES ==========
    console.log('\n📋 All Indexes Summary:\n');
    
    const collections = ['movies', 'users', 'watch_history', 'reviews'];
    
    for (const collName of collections) {
      console.log(`📁 ${collName}:`);
      const indexes = await db.collection(collName).indexes();
      indexes.forEach(index => {
        console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      console.log('');
    }
    
    console.log('✨ All indexes created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await closeDB();
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes();
}

module.exports = createIndexes;