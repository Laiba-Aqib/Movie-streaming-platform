/**
 * User Model
 * Represents a user in the streaming platform
 */

const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class User {
  /**
   * Get collection
   */
  static getCollection() {
    const db = getDB();
    return db.collection('users');
  }

  /**
   * Schema definition (for documentation)
   */
  static schema = {
    _id: ObjectId,
    name: String,
    email: String,              // Unique
    subscription_type: String,  // "basic", "premium", "vip"
    created_at: Date
  };

  /**
   * Valid subscription types
   */
  static subscriptionTypes = ['basic', 'premium', 'vip'];

  /**
   * Validation rules
   */
  static validate(userData) {
    const errors = [];

    if (!userData.name || typeof userData.name !== 'string') {
      errors.push('Name is required and must be a string');
    }

    if (!userData.email || typeof userData.email !== 'string') {
      errors.push('Email is required and must be a string');
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        errors.push('Email format is invalid');
      }
    }

    if (!userData.subscription_type) {
      errors.push('Subscription type is required');
    } else if (!this.subscriptionTypes.includes(userData.subscription_type)) {
      errors.push(`Subscription type must be one of: ${this.subscriptionTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ _id: new ObjectId(id) });
      return user;
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  /**
   * Find users by criteria
   */
  static async find(query = {}, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10, skip = 0, sort = {} } = options;
      
      const users = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return users;
    } catch (error) {
      throw new Error(`Error finding users: ${error.message}`);
    }
  }

  /**
   * Get users by subscription type
   */
  static async getBySubscription(subscriptionType) {
    try {
      if (!this.subscriptionTypes.includes(subscriptionType)) {
        throw new Error('Invalid subscription type');
      }

      const collection = this.getCollection();
      const users = await collection
        .find({ subscription_type: subscriptionType })
        .toArray();
      
      return users;
    } catch (error) {
      throw new Error(`Error getting users by subscription: ${error.message}`);
    }
  }

  /**
   * Get user count
   */
  static async count(query = {}) {
    try {
      const collection = this.getCollection();
      return await collection.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }

  /**
   * Create new user
   */
  static async create(userData) {
    try {
      const validation = this.validate(userData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      const collection = this.getCollection();
      const result = await collection.insertOne({
        ...userData,
        email: userData.email.toLowerCase(),
        created_at: new Date()
      });

      return result;
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  /**
   * Update user
   */
  static async update(id, updateData) {
    try {
      // Don't allow email updates to avoid uniqueness issues
      if (updateData.email) {
        delete updateData.email;
      }

      // Validate subscription type if provided
      if (updateData.subscription_type && !this.subscriptionTypes.includes(updateData.subscription_type)) {
        throw new Error('Invalid subscription type');
      }

      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updated_at: new Date() } }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  /**
   * Update subscription
   */
  static async updateSubscription(id, subscriptionType) {
    try {
      if (!this.subscriptionTypes.includes(subscriptionType)) {
        throw new Error('Invalid subscription type');
      }

      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { subscription_type: subscriptionType, updated_at: new Date() } }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating subscription: ${error.message}`);
    }
  }

  /**
   * Delete user
   */
  static async delete(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   */
  static async getStatistics(userId) {
    try {
      const db = getDB();
      
      // Get watch history count
      const watchCount = await db.collection('watch_history')
        .countDocuments({ user_id: new ObjectId(userId) });
      
      // Get review count
      const reviewCount = await db.collection('reviews')
        .countDocuments({ user_id: new ObjectId(userId) });
      
      // Get total watch time
      const watchStats = await db.collection('watch_history')
        .aggregate([
          { $match: { user_id: new ObjectId(userId) } },
          {
            $group: {
              _id: null,
              total_duration: { $sum: '$watch_duration' },
              unique_movies: { $addToSet: '$movie_id' }
            }
          }
        ])
        .toArray();
      
      const stats = watchStats[0] || { total_duration: 0, unique_movies: [] };
      
      return {
        total_watches: watchCount,
        total_reviews: reviewCount,
        total_watch_time: stats.total_duration,
        unique_movies_watched: stats.unique_movies.length
      };
    } catch (error) {
      throw new Error(`Error getting user statistics: ${error.message}`);
    }
  }
}

module.exports = User;