const { connectDB, closeDB } = require('../config/database');

async function createIndexes() {
  try {
    console.log('Creating database indexes...\n');
    const db = await connectDB();
    
    console.log('Creating indexes for movies collection...');
    
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
    console.log('Text search index created');
    
    await db.collection('movies').createIndex(
      { rating: -1 },
      { name: 'rating_index' }
    );
    console.log('Rating index created');
    
    await db.collection('movies').createIndex(
      { watch_count: -1 },
      { name: 'watch_count_index' }
    );
    console.log('Watch count index created');
    
    await db.collection('movies').createIndex(
      { genres: 1 },
      { name: 'genres_index' }
    );
    console.log('Genres index created');
    
    console.log('Creating indexes for users collection...');
    
    await db.collection('users').createIndex(
      { email: 1 },
      { unique: true, name: 'email_unique_index' }
    );
    console.log('Email unique index created');
    
    await db.collection('users').createIndex(
      { subscription_type: 1 },
      { name: 'subscription_index' }
    );
    console.log('Subscription index created');
    
    console.log('Creating indexes for watch_history collection...');
    
    await db.collection('watch_history').createIndex(
      { user_id: 1, watched_at: -1 },
      { name: 'user_history_index' }
    );
    console.log('User history index created');
    
    await db.collection('watch_history').createIndex(
      { movie_id: 1 },
      { name: 'movie_watch_index' }
    );
    console.log('Movie watch index created');
    
    await db.collection('watch_history').createIndex(
      { watched_at: -1 },
      { name: 'watched_at_index' }
    );
    console.log('Watched at index created');
    
    console.log('Creating indexes for reviews collection...');
    
    await db.collection('reviews').createIndex(
      { user_id: 1, movie_id: 1 },
      { unique: true, name: 'unique_user_movie_review' }
    );
    console.log('Unique user-movie review index created');
    
    await db.collection('reviews').createIndex(
      { movie_id: 1, created_at: -1 },
      { name: 'movie_reviews_index' }
    );
    console.log('Movie reviews index created');
    
    await db.collection('reviews').createIndex(
      { rating: -1 },
      { name: 'rating_reviews_index' }
    );
    console.log('Rating reviews index created');
    
    console.log('All Indexes Summary:\n');
    
    const collections = ['movies', 'users', 'watch_history', 'reviews'];
    
    for (const collName of collections) {
      console.log(`${collName}:`);
      const indexes = await db.collection(collName).indexes();
      indexes.forEach(index => {
        console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
      });
      console.log('');
    }
    
    console.log('All indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  createIndexes();
}

module.exports = createIndexes;
