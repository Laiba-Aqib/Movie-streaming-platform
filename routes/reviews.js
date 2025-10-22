const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const db = getDB();
    const { user_id, movie_id, rating, review_text } = req.body;

    if (!user_id || !movie_id || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, movie_id, rating' 
      });
    }

    if (rating < 1 || rating > 10) {
      return res.status(400).json({ 
        error: 'Rating must be between 1 and 10' 
      });
    }

    const userId = new ObjectId(user_id);
    const movieId = new ObjectId(movie_id);

    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const movie = await db.collection('movies').findOne({ _id: movieId });
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    const existingReview = await db.collection('reviews').findOne({
      user_id: userId,
      movie_id: movieId
    });

    if (existingReview) {
      return res.status(400).json({ 
        error: 'You have already reviewed this movie',
        existing_review_id: existingReview._id
      });
    }

    const review = {
      user_id: userId,
      movie_id: movieId,
      rating: parseFloat(rating),
      review_text: review_text || '',
      created_at: new Date()
    };

    const result = await db.collection('reviews').insertOne(review);

    res.status(201).json({
      message: 'Review created successfully',
      review: {
        _id: result.insertedId,
        ...review
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review', message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const reviewId = new ObjectId(req.params.id);

    const review = await db.collection('reviews')
      .aggregate([
        { $match: { _id: reviewId } },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'movies',
            localField: 'movie_id',
            foreignField: '_id',
            as: 'movie'
          }
        },
        { $unwind: '$user' },
        { $unwind: '$movie' },
        {
          $project: {
            _id: 1,
            rating: 1,
            review_text: 1,
            created_at: 1,
            user: {
              _id: '$user._id',
              name: '$user.name'
            },
            movie: {
              _id: '$movie._id',
              title: '$movie.title',
              year: '$movie.year'
            }
          }
        }
      ])
      .toArray();

    if (review.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review[0]);

  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to get review', message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const reviewId = new ObjectId(req.params.id);

    const result = await db.collection('reviews').deleteOne({ _id: reviewId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ 
      message: 'Review deleted successfully',
      deleted_id: reviewId
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review', message: error.message });
  }
});

module.exports = router;
