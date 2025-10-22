
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class Review {

  static getCollection() {
    const db = getDB();
    return db.collection('reviews');
  }


  static schema = {
    _id: ObjectId,
    user_id: ObjectId,        // Reference to users collection
    movie_id: ObjectId,       // Reference to movies collection
    rating: Number,           // 1-10 scale
    review_text: String,
    created_at: Date
  };

  static validate(reviewData) {
    const errors = [];

    if (!reviewData.user_id) {
      errors.push('User ID is required');
    }

    if (!reviewData.movie_id) {
      errors.push('Movie ID is required');
    }

    if (!reviewData.rating) {
      errors.push('Rating is required');
    } else if (typeof reviewData.rating !== 'number' || reviewData.rating < 1 || reviewData.rating > 10) {
      errors.push('Rating must be a number between 1 and 10');
    }

    if (reviewData.review_text && typeof reviewData.review_text !== 'string') {
      errors.push('Review text must be a string');
    }

    if (reviewData.review_text && reviewData.review_text.length > 1000) {
      errors.push('Review text cannot exceed 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async create(reviewData) {
    try {
      const validation = this.validate(reviewData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const db = getDB();
      
      // Verifying if user exists
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(reviewData.user_id) 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Verifying if movie exists
      const movie = await db.collection('movies').findOne({ 
        _id: new ObjectId(reviewData.movie_id) 
      });
      if (!movie) {
        throw new Error('Movie not found');
      }

      // Checking if user already reviewed this movie
      const existingReview = await this.getCollection().findOne({
        user_id: new ObjectId(reviewData.user_id),
        movie_id: new ObjectId(reviewData.movie_id)
      });

      if (existingReview) {
        throw new Error('You have already reviewed this movie');
      }

      const collection = this.getCollection();
      const result = await collection.insertOne({
        user_id: new ObjectId(reviewData.user_id),
        movie_id: new ObjectId(reviewData.movie_id),
        rating: parseFloat(reviewData.rating),
        review_text: reviewData.review_text || '',
        created_at: new Date()
      });

      return result;
    } catch (error) {
      throw new Error(`Error creating review: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const collection = this.getCollection();
      
      const review = await collection
        .aggregate([
          { $match: { _id: new ObjectId(id) } },
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
          { $unwind: '$movie' }
        ])
        .toArray();

      return review[0] || null;
    } catch (error) {
      throw new Error(`Error finding review: ${error.message}`);
    }
  }

  static async getByMovieId(movieId, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10, skip = 0, sort = { created_at: -1 } } = options;

      const reviews = await collection
        .aggregate([
          { $match: { movie_id: new ObjectId(movieId) } },
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
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

      return reviews;
    } catch (error) {
      throw new Error(`Error getting reviews by movie: ${error.message}`);
    }
  }

  static async getByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10, skip = 0 } = options;

      const reviews = await collection
        .aggregate([
          { $match: { user_id: new ObjectId(userId) } },
          { $sort: { created_at: -1 } },
          { $skip: skip },
          { $limit: limit },
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
              rating: 1,
              review_text: 1,
              created_at: 1,
              movie: {
                _id: '$movie._id',
                title: '$movie.title',
                year: '$movie.year'
              }
            }
          }
        ])
        .toArray();

      return reviews;
    } catch (error) {
      throw new Error(`Error getting reviews by user: ${error.message}`);
    }
  }

  static async getMovieStats(movieId) {
    try {
      const collection = this.getCollection();

      const stats = await collection
        .aggregate([
          { $match: { movie_id: new ObjectId(movieId) } },
          {
            $group: {
              _id: null,
              average_rating: { $avg: '$rating' },
              total_reviews: { $sum: 1 },
              highest_rating: { $max: '$rating' },
              lowest_rating: { $min: '$rating' }
            }
          }
        ])
        .toArray();

      if (stats.length === 0) {
        return {
          average_rating: 0,
          total_reviews: 0,
          highest_rating: 0,
          lowest_rating: 0
        };
      }

      return {
        average_rating: parseFloat(stats[0].average_rating.toFixed(2)),
        total_reviews: stats[0].total_reviews,
        highest_rating: stats[0].highest_rating,
        lowest_rating: stats[0].lowest_rating
      };
    } catch (error) {
      throw new Error(`Error getting movie stats: ${error.message}`);
    }
  }

  static async getTopRatedMovies(limit = 10, minReviews = 3) {
    try {
      const collection = this.getCollection();

      const topRated = await collection
        .aggregate([
          {
            $group: {
              _id: '$movie_id',
              average_rating: { $avg: '$rating' },
              review_count: { $sum: 1 }
            }
          },
          {
            $match: {
              review_count: { $gte: minReviews }
            }
          },
          {
            $sort: { average_rating: -1 }
          },
          {
            $limit: limit
          },
          {
            $lookup: {
              from: 'movies',
              localField: '_id',
              foreignField: '_id',
              as: 'movie'
            }
          },
          {
            $unwind: '$movie'
          },
          {
            $project: {
              _id: 0,
              movie_id: '$_id',
              title: '$movie.title',
              year: '$movie.year',
              genres: '$movie.genres',
              average_rating: { $round: ['$average_rating', 2] },
              review_count: 1
            }
          }
        ])
        .toArray();

      return topRated;
    } catch (error) {
      throw new Error(`Error getting top rated movies: ${error.message}`);
    }
  }

  static async getRecent(limit = 10) {
    try {
      const collection = this.getCollection();

      const reviews = await collection
        .aggregate([
          { $sort: { created_at: -1 } },
          { $limit: limit },
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
                title: '$movie.title'
              }
            }
          }
        ])
        .toArray();

      return reviews;
    } catch (error) {
      throw new Error(`Error getting recent reviews: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    try {
      // Validate rating if provided
      if (updateData.rating !== undefined) {
        if (typeof updateData.rating !== 'number' || updateData.rating < 1 || updateData.rating > 10) {
          throw new Error('Rating must be a number between 1 and 10');
        }
      }

      // Validate review text length
      if (updateData.review_text && updateData.review_text.length > 1000) {
        throw new Error('Review text cannot exceed 1000 characters');
      }

      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            ...updateData, 
            updated_at: new Date() 
          } 
        }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating review: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw new Error(`Error deleting review: ${error.message}`);
    }
  }

  static async hasReviewed(userId, movieId) {
    try {
      const collection = this.getCollection();
      const review = await collection.findOne({
        user_id: new ObjectId(userId),
        movie_id: new ObjectId(movieId)
      });

      return review !== null;
    } catch (error) {
      throw new Error(`Error checking review status: ${error.message}`);
    }
  }

  static async getMovieReviewCount(movieId) {
    try {
      const collection = this.getCollection();
      const count = await collection.countDocuments({
        movie_id: new ObjectId(movieId)
      });

      return count;
    } catch (error) {
      throw new Error(`Error getting review count: ${error.message}`);
    }
  }

 
  static async deleteByUser(userId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteMany({ 
        user_id: new ObjectId(userId) 
      });
      return result;
    } catch (error) {
      throw new Error(`Error deleting user reviews: ${error.message}`);
    }
  }

 
  static async deleteByMovie(movieId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteMany({ 
        movie_id: new ObjectId(movieId) 
      });
      return result;
    } catch (error) {
      throw new Error(`Error deleting movie reviews: ${error.message}`);
    }
  }
}


module.exports = Review;
