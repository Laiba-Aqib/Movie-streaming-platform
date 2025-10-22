
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class User {

  static getCollection() {
    const db = getDB();
    return db.collection('users');
  }


  static schema = {
    _id: ObjectId,
    name: String,
    email: String,              
    subscription_type: String,  
    created_at: Date
  };
  static subscriptionTypes = ['basic', 'premium', 'vip'];

  
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

  static async findById(id) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ _id: new ObjectId(id) });
      return user;
    } catch (error) {
      throw new Error(`Error finding user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const collection = this.getCollection();
      const user = await collection.findOne({ email: email.toLowerCase() });
      return user;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }
  
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
  
  static async count(query = {}) {
    try {
      const collection = this.getCollection();
      return await collection.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting users: ${error.message}`);
    }
  }
  
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
  static async update(id, updateData) {
    try {
      // Don't allowing email updates to avoid uniqueness issues
      if (updateData.email) {
        delete updateData.email;
      }

      // Validating subscription type if provided
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
  static async delete(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

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
