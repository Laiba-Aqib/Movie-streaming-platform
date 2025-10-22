const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { calculateHybridScore, calculateSimilarity } = require('../utils/searchRanking');

const router = express.Router();

// ✅ IMPROVED FUZZY SEARCH (handles typos like "The Great Tran Robber")
router.get('/search', async (req, res) => {
  try {
    const db = getDB();
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Fetch all movies (only required fields for efficiency)
    const movies = await db.collection('movies')
      .find({}, {
        projection: {
          title: 1,
          cast: 1,
          directors: 1,
          rating: 1,
          watch_count: 1,
          year: 1,
          genres: 1
        }
      })
      .toArray();

    // Compute fuzzy similarity and hybrid score
    const rankedMovies = movies
      .map(movie => {
        const sim = calculateSimilarity(query, movie.title || '');
        const hybrid = calculateHybridScore(movie, query);
        return { ...movie, similarity: sim, hybrid_score: hybrid };
      })
      // Keep only reasonable matches (ignore completely different names)
      .filter(m => m.similarity > 0.4)
      // Sort by hybrid score (desc)
      .sort((a, b) => b.hybrid_score - a.hybrid_score)
      // Limit final output
      .slice(0, parseInt(limit));

    res.json({
      query,
      total_results: rankedMovies.length,
      results: rankedMovies.map(m => ({
        _id: m._id,
        title: m.title,
        year: m.year,
        genres: m.genres,
        cast: m.cast,
        directors: m.directors,
        rating: m.rating,
        watch_count: m.watch_count,
        similarity: m.similarity.toFixed(2),
        hybrid_score: m.hybrid_score.toFixed(2)
      }))
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// GET /api/movies/top-watched?days=30&limit=5
// Top watched movies in last N days
router.get('/top-watched', async (req, res) => {
  try {
    const db = getDB();
    const { days = 30, limit = 5 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const topMovies = await db.collection('watch_history')
      .aggregate([
        {
          $match: {
            watched_at: { $gte: daysAgo }
          }
        },
        {
          $group: {
            _id: '$movie_id',
            watch_count: { $sum: 1 },
            total_duration: { $sum: '$watch_duration' }
          }
        },
        {
          $sort: { watch_count: -1 }
        },
        {
          $limit: parseInt(limit)
        },
        {
          $lookup: {
            from: 'movies',
            localField: '_id',
            foreignField: '_id',
            as: 'movie_details'
          }
        },
        {
          $unwind: '$movie_details'
        },
        {
          $project: {
            _id: 0,
            movie_id: '$_id',
            title: '$movie_details.title',
            year: '$movie_details.year',
            genres: '$movie_details.genres',
            rating: '$movie_details.rating',
            watch_count: 1,
            total_duration: 1
          }
        }
      ])
      .toArray();

    res.json({
      period: `Last ${days} days`,
      total_movies: topMovies.length,
      top_movies: topMovies
    });

  } catch (error) {
    console.error('Top watched error:', error);
    res.status(500).json({ error: 'Failed to get top watched movies', message: error.message });
  }
});

// GET /api/movies/:id
// Get movie details
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const movieId = new ObjectId(req.params.id);

    const movie = await db.collection('movies').findOne({ _id: movieId });

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Get review stats
    const reviewStats = await db.collection('reviews')
      .aggregate([
        { $match: { movie_id: movieId } },
        {
          $group: {
            _id: null,
            avg_rating: { $avg: '$rating' },
            review_count: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const stats = reviewStats[0] || { avg_rating: 0, review_count: 0 };

    res.json({
      ...movie,
      review_stats: {
        average_rating: stats.avg_rating ? stats.avg_rating.toFixed(1) : 0,
        total_reviews: stats.review_count
      }
    });

  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: 'Failed to get movie', message: error.message });
  }
});

// GET /api/movies/:id/reviews
// Get all reviews for a movie
router.get('/:id/reviews', async (req, res) => {
  try {
    const db = getDB();
    const movieId = new ObjectId(req.params.id);
    const { limit = 10, skip = 0 } = req.query;

    const reviews = await db.collection('reviews')
      .aggregate([
        { $match: { movie_id: movieId } },
        { $sort: { created_at: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 1,
            rating: 1,
            review_text: 1,
            created_at: 1,
            user: {
              _id: '$user._id',
              name: '$user.name'
            }
          }
        }
      ])
      .toArray();

    res.json({
      movie_id: movieId,
      total_reviews: reviews.length,
      reviews
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews', message: error.message });
  }
});

module.exports = router;
