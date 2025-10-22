
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

class Movie {

  static getCollection() {
    const db = getDB();
    return db.collection('movies');
  }

  static schema = {
    _id: ObjectId,
    title: String,
    year: Number,
    genres: [String],
    cast: [String],
    directors: [String],
    rating: Number,        
    watch_count: Number    
  };

  static validate(movieData) {
    const errors = [];

    if (!movieData.title || typeof movieData.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (!movieData.year || typeof movieData.year !== 'number') {
      errors.push('Year is required and must be a number');
    }

    if (movieData.year < 1800 || movieData.year > new Date().getFullYear() + 5) {
      errors.push('Year must be between 1800 and 5 years in the future');
    }

    if (movieData.rating !== undefined) {
      if (typeof movieData.rating !== 'number' || movieData.rating < 0 || movieData.rating > 10) {
        errors.push('Rating must be a number between 0 and 10');
      }
    }

    if (movieData.genres && !Array.isArray(movieData.genres)) {
      errors.push('Genres must be an array');
    }

    if (movieData.cast && !Array.isArray(movieData.cast)) {
      errors.push('Cast must be an array');
    }

    if (movieData.directors && !Array.isArray(movieData.directors)) {
      errors.push('Directors must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async findById(id) {
    try {
      const collection = this.getCollection();
      const movie = await collection.findOne({ _id: id });
      return movie;
    } catch (error) {
      throw new Error(`Error finding movie: ${error.message}`);
    }
  }

  static async find(query = {}, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10, skip = 0, sort = {} } = options;
      
      const movies = await collection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return movies;
    } catch (error) {
      throw new Error(`Error finding movies: ${error.message}`);
    }
  }

  static async search(searchText, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10 } = options;
      
      const movies = await collection
        .find({ $text: { $search: searchText } })
        .limit(limit)
        .toArray();
      
      return movies;
    } catch (error) {
      throw new Error(`Error searching movies: ${error.message}`);
    }
  }
  static async getTopRated(limit = 10) {
    try {
      const collection = this.getCollection();
      
      const movies = await collection
        .find({ rating: { $exists: true } })
        .sort({ rating: -1 })
        .limit(limit)
        .toArray();
      
      return movies;
    } catch (error) {
      throw new Error(`Error getting top rated movies: ${error.message}`);
    }
  }

  static async getByGenre(genre, options = {}) {
    try {
      const collection = this.getCollection();
      const { limit = 10, skip = 0 } = options;
      
      const movies = await collection
        .find({ genres: genre })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      return movies;
    } catch (error) {
      throw new Error(`Error getting movies by genre: ${error.message}`);
    }
  }

  static async count(query = {}) {
    try {
      const collection = this.getCollection();
      return await collection.countDocuments(query);
    } catch (error) {
      throw new Error(`Error counting movies: ${error.message}`);
    }
  }

  static async create(movieData) {
    try {
      const validation = this.validate(movieData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const collection = this.getCollection();
      const result = await collection.insertOne({
        ...movieData,
        watch_count: movieData.watch_count || 0,
        created_at: new Date()
      });

      return result;
    } catch (error) {
      throw new Error(`Error creating movie: ${error.message}`);
    }
  }

  static async update(id, updateData) {
    try {
      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { ...updateData, updated_at: new Date() } }
      );

      return result;
    } catch (error) {
      throw new Error(`Error updating movie: ${error.message}`);
    }
  }

 
  static async incrementWatchCount(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $inc: { watch_count: 1 } }
      );

      return result;
    } catch (error) {
      throw new Error(`Error incrementing watch count: ${error.message}`);
    }
  }

  static async delete(id) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result;
    } catch (error) {
      throw new Error(`Error deleting movie: ${error.message}`);
    }
  }
}


module.exports = Movie;
