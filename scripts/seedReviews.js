const { connectDB, closeDB } = require('../config/database');

const reviewTemplates = [
  "Amazing movie! Loved every minute of it.",
  "Great film with excellent performances.",
  "Decent movie, but could have been better.",
  "Not my cup of tea, but well made.",
  "Absolutely brilliant! A must-watch.",
  "Disappointing. Expected more from this.",
  "Solid entertainment. Worth watching.",
  "Masterpiece! One of the best I've seen.",
  "Boring and predictable plot.",
  "Good movie with some memorable scenes.",
  "The cast was outstanding!",
  "Visually stunning but weak story.",
  "Highly recommend this to everyone!",
  "Waste of time. Wouldn't watch again.",
  "Pretty good overall. Enjoyed it.",
  "Incredible cinematography and direction.",
  "Average at best. Nothing special.",
  "This movie exceeded my expectations!",
  "Confusing plot but great acting.",
  "A timeless classic. Simply amazing."
];

function randomRating() {
  const rand = Math.random();
  if (rand < 0.4) return Math.floor(Math.random() * 3) + 8;
  if (rand < 0.7) return Math.floor(Math.random() * 2) + 6;
  return Math.floor(Math.random() * 5) + 1;
}

function randomDateWithinDays(days) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
  const randomTime = pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime());
  return new Date(randomTime);
}

async function seedReviews() {
  try {
    const db = await connectDB();
    const users = await db.collection('users').find({}).toArray();
    const movies = await db.collection('movies').find({}).limit(100).toArray();

    if (users.length === 0) {
      console.log('No users found. Please run seedUsers.js first.');
      return;
    }

    if (movies.length === 0) {
      console.log('No movies found. Please import movies first.');
      return;
    }

    await db.collection('reviews').deleteMany({});

    const reviews = [];

    for (const user of users) {
      const numReviews = Math.floor(Math.random() * 6) + 3;
      const reviewedMovies = new Set();

      for (let i = 0; i < numReviews; i++) {
        let randomMovie;
        let attempts = 0;
        do {
          randomMovie = movies[Math.floor(Math.random() * movies.length)];
          attempts++;
        } while (reviewedMovies.has(randomMovie._id.toString()) && attempts < 10);

        if (attempts >= 10) break;

        reviewedMovies.add(randomMovie._id.toString());

        const randomReview = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];

        reviews.push({
          user_id: user._id,
          movie_id: randomMovie._id,
          rating: randomRating(),
          review_text: randomReview,
          created_at: randomDateWithinDays(90)
        });
      }
    }

    const result = await db.collection('reviews').insertMany(reviews);
    console.log(`Inserted ${result.insertedCount} reviews`);

    const stats = await db.collection('reviews')
      .aggregate([
        {
          $group: {
            _id: null,
            total_reviews: { $sum: 1 },
            avg_rating: { $avg: '$rating' },
            unique_users: { $addToSet: '$user_id' },
            unique_movies: { $addToSet: '$movie_id' }
          }
        }
      ])
      .toArray();

    if (stats.length > 0) {
      console.log('Review Statistics:');
      console.log(`- Total reviews: ${stats[0].total_reviews}`);
      console.log(`- Average rating: ${stats[0].avg_rating.toFixed(2)}`);
      console.log(`- Unique reviewers: ${stats[0].unique_users.length}`);
      console.log(`- Unique movies reviewed: ${stats[0].unique_movies.length}`);
    }

    const topRated = await db.collection('reviews')
      .aggregate([
        {
          $group: {
            _id: '$movie_id',
            avg_rating: { $avg: '$rating' },
            review_count: { $sum: 1 }
          }
        },
        { $match: { review_count: { $gte: 2 } } },
        { $sort: { avg_rating: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'movies',
            localField: '_id',
            foreignField: '_id',
            as: 'movie'
          }
        },
        { $unwind: '$movie' }
      ])
      .toArray();

    if (topRated.length > 0) {
      console.log('Top Rated Movies (with 2+ reviews):');
      topRated.forEach((item, index) => {
        console.log(`${index + 1}. ${item.movie.title} - ${item.avg_rating.toFixed(1)}/10 (${item.review_count} reviews)`);
      });
    }

    console.log('Review seeding completed.');
  } catch (error) {
    console.error('Error seeding reviews:', error);
  } finally {
    await closeDB();
  }
}

if (require.main === module) {
  seedReviews();
}

module.exports = seedReviews;
