const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const router = express.Router();

router.get('/:id/history', async (req, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.params.id);
    const { limit = 20, skip = 0 } = req.query;

    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const history = await db.collection('watch_history')
      .aggregate([
        { $match: { user_id: userId } },
        { $sort: { watched_at: -1 } },
        { $skip: parseInt(skip) },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'movies',
            localField: 'movie_id',
            foreignField: '_id',
            as: 'movie'
          }
        },
        { $unwind: '$movie' },
        {
          $project: {
            _id: 1,
            watched_at: 1,
            watch_duration: 1,
            movie: {
              _id: '$movie._id',
              title: '$movie.title',
              year: '$movie.year',
              genres: '$movie.genres',
              rating: '$movie.rating'
            }
          }
        }
      ])
      .toArray();

    const stats = await db.collection('watch_history')
      .aggregate([
        { $match: { user_id: userId } },
        {
          $group: {
            _id: null,
            total_watches: { $sum: 1 },
            total_duration: { $sum: '$watch_duration' },
            unique_movies: { $addToSet: '$movie_id' }
          }
        }
      ])
      .toArray();

    const userStats = stats[0] || { 
      total_watches: 0, 
      total_duration: 0, 
      unique_movies: [] 
    };

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        subscription_type: user.subscription_type
      },
      statistics: {
        total_watches: userStats.total_watches,
        total_watch_time_minutes: userStats.total_duration,
        unique_movies_watched: userStats.unique_movies.length
      },
      history
    });

  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get watch history', message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const userId = new ObjectId(req.params.id);

    const user = await db.collection('users').findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const watchCount = await db.collection('watch_history').countDocuments({ user_id: userId });
    const reviewCount = await db.collection('reviews').countDocuments({ user_id: userId });

    res.json({
      ...user,
      stats: {
        total_watches: watchCount,
        total_reviews: reviewCount
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { limit = 10 } = req.query;

    const users = await db.collection('users')
      .find({})
      .limit(parseInt(limit))
      .toArray();

    res.json({
      total: users.length,
      users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users', message: error.message });
  }
});

module.exports = router;
