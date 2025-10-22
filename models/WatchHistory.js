
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class WatchHistory {

  static getCollection() {
    const db = getDB();
    return db.collection('watch_history');
  }

  static schema = {
    _id: ObjectId,
    user_id: ObjectId,        
    movie_id: ObjectId,       
    watched_at: Date,
    watch_duration: Number    
  };

  static validate(watchData) {
    const errors = [];

    if (!watchData.user_id) {
      errors.push('User ID is required');
    }

    if (!watchData.movie_id) {
      errors.push('Movie ID is required');
    }

    if (watchData.watch_duration !== undefined) {
      if (typeof watchData.watch_duration !== 'number' || watchData.watch_duration < 0) {
        errors.push('Watch duration must be a positive number');
      }
      if (watchData.watch_duration > 600) { // 10 hours max
        errors.push('Watch duration seems too long (max 600 minutes)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async create(watchData) {
    try {
      const validation = this.validate(watchData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Verifying if user exists
      const db = getDB();
      const user = await db.collection('users').findOne({ 
        _id: new ObjectId(watchData.user_id) 
      });
      if (!user) {
        throw new Error('User not found');
      }

      // Verify movie exists
      const movie = await db.collection('movies').findOne({ 
        _id: new ObjectId(watchData.movie_id) 
      });
      if (!movie) {
        throw new Error('Movie not found');
      }

      const collection = this.getCollection();
      const result = await collection.insertOne({
        user_id: new ObjectId(watchData.user_id),
        movie_id: new ObjectId(watchData.movie_id),
        watched_at: watchData.watched_at || new Date(),
        watch_duration: watchData.watch_duration || 0
      });

      // Optionally incrementing movie watch count
      await db.collection('movies').updateOne(
        { _id: new ObjectId(watchData.movie_id) },
        { $inc: { watch_count: 1 } }
      );

      return result;
    } catch (error) {
      throw new Error(`Error creating watch history: ${error.message}`);
    }
  }

  static async getByUserId(userId, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 20, skip = 0 } = options;

      const history = await collection
        .aggregate([
          {
            $match: { user_id: new ObjectId(userId) }
          },
          {
            $sort: { watched_at: -1 }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          },
          {
            $lookup: {
              from: 'movies',
              localField: 'movie_id',
              foreignField: '_id',
              as: 'movie'
            }
          },
          {
            $unwind: '$movie'
          }
        ])
        .toArray();

      return history;
    } catch (error) {
      throw new Error(`Error getting watch history: ${error.message}`);
    }
  }
  static async getByMovieId(movieId, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 20, skip = 0 } = options;

      const history = await collection
        .find({ movie_id: new ObjectId(movieId) })
        .sort({ watched_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      return history;
    } catch (error) {
      throw new Error(`Error getting watch history by movie: ${error.message}`);
    }
  }

  static async getUserStats(userId) {
    try {
      const collection = this.getCollection();

      const stats = await collection
        .aggregate([
          {
            $match: { user_id: new ObjectId(userId) }
          },
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

      if (stats.length === 0) {
        return {
          total_watches: 0,
          total_duration: 0,
          unique_movies_count: 0
        };
      }

      return {
        total_watches: stats[0].total_watches,
        total_duration: stats[0].total_duration,
        unique_movies_count: stats[0].unique_movies.length
      };
    } catch (error) {
      throw new Error(`Error getting user stats: ${error.message}`);
    }
  }

  static async getTopWatched(days = 30, limit = 5) {
    try {
      const collection = this.getCollection();
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      const topMovies = await collection
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
            $limit: limit
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
          }
        ])
        .toArray();

      return topMovies;
    } catch (error) {
      throw new Error(`Error getting top watched movies: ${error.message}`);
    }
  }

  static async getRecentByUser(userId, limit = 5) {
    try {
      const collection = this.getCollection();

      const recent = await collection
        .aggregate([
          {
            $match: { user_id: new ObjectId(userId) }
          },
          {
            $sort: { watched_at: -1 }
          },
          {
            $limit: limit
          },
          {
            $lookup: {
              from: 'movies',
              localField: 'movie_id',
              foreignField: '_id',
              as: 'movie'
            }
          },
          {
            $unwind: '$movie'
          }
        ])
        .toArray();

      return recent;
    } catch (error) {
      throw new Error(`Error getting recent watches: ${error.message}`);
    }
  }


  static async hasWatched(userId, movieId) {
    try {
      const collection = this.getCollection();
      const record = await collection.findOne({
        user_id: new ObjectId(userId),
        movie_id: new ObjectId(movieId)
      });

      return record !== null;
    } catch (error) {
      throw new Error(`Error checking watch status: ${error.message}`);
    }
  }
  static async getMovieWatchCount(movieId) {
    try {
      const collection = this.getCollection();
      const count = await collection.countDocuments({
        movie_id: new ObjectId(movieId)
      });

      return count;
    } catch (error) {
      throw new Error(`Error getting movie watch count: ${error.message}`);
    }
  }


  static async delete(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw new Error(`Error deleting watch history: ${error.message}`);
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
      throw new Error(`Error deleting user watch history: ${error.message}`);
    }
  }
}


module.exports = WatchHistory;
