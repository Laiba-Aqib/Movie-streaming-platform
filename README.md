# Movie Streaming Platform Backend

A RESTful API backend for a movie streaming platform built using Node.js, Express, and MongoDB.

## Student Information

* Project: Mid-Term Database Project
* Duration: 7 days
* Weightage: 30%

---

## Table of Contents

* Features
* Technologies Used
* Database Schema
* Installation
* API Endpoints
* Hybrid Search Algorithm
* Aggregation Query
* Testing the APIs
* Project Structure
* Screenshots to Include
* Submission Checklist

---

## Features

### Core Functionality

* Hybrid Search: Multi-field search with intelligent ranking
* Watch History Tracking: User viewing analytics
* Review System: User ratings and text reviews
* Top Movies Analytics: Most-watched movies in defined time periods
* Fuzzy Matching: Handles typos in search queries

### Advanced Features

* Weighted ranking algorithm (50% similarity + 30% rating + 20% popularity)
* Aggregation pipelines for analytics
* Multi-field text indexes for faster search
* Real-time statistics
* Input validation and error handling

---

## Technologies Used

* Runtime: Node.js v14+
* Framework: Express.js
* Database: MongoDB v6+
* Additional Libraries:

  * mongodb
  * cors
  * dotenv

---

## Database Schema

### Collections Overview

#### 1. movies

```javascript
{
  _id: ObjectId,
  title: String,
  year: Number,
  genres: [String],
  cast: [String],
  directors: [String],
  rating: Number,
  watch_count: Number
}
```

#### 2. users

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  subscription_type: String,
  created_at: Date
}
```

#### 3. watch_history

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  movie_id: ObjectId,
  watched_at: Date,
  watch_duration: Number
}
```

#### 4. reviews

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,
  movie_id: ObjectId,
  rating: Number,
  review_text: String,
  created_at: Date
}
```

### Relationships

* One-to-Many: User → Watch History
* One-to-Many: Movie → Watch History
* One-to-Many: User → Reviews
* One-to-Many: Movie → Reviews

---

## Installation

### Prerequisites

* Node.js (v14 or higher)
* MongoDB (v4.4 or higher)
* Movies dataset imported in `movieDB.movies`

### Setup Steps

1. Create project directory:

```bash
mkdir movie-streaming-backend
cd movie-streaming-backend
```

2. Initialize Node.js:

```bash
npm init -y
```

3. Install dependencies:

```bash
npm install express mongodb dotenv cors
npm install --save-dev nodemon
```

4. Create directory structure:

```bash
mkdir config routes utils scripts
```

5. Add the following files:

* server.js
* config/database.js
* routes/movies.js
* routes/users.js
* routes/reviews.js
* utils/searchRanking.js
* scripts/seedUsers.js
* scripts/seedWatchHistory.js
* scripts/seedReviews.js
* scripts/createIndexes.js
* .env
* package.json

6. Create `.env` file:

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=movieDB
PORT=3000
```

7. Seed database:

```bash
npm run seed:all
```

8. Create indexes:

```bash
npm run indexes
```

9. Start the server:

```bash
npm start
```

---

## API Endpoints

### 1. Movie Search (Hybrid Search)

**GET /api/movies/search**

Parameters:

* query (required)
* limit (optional, default: 10)

Response:

```json
{
  "query": "Godfather",
  "total_results": 5,
  "results": [
    {
      "title": "The Godfather",
      "year": 1972,
      "rating": 9.2,
      "watch_count": 1523,
      "hybrid_score": "0.95"
    }
  ]
}
```

---

### 2. User Watch History

**GET /api/users/:id/history**

Response:

```json
{
  "user": { "name": "Alice", "subscription_type": "premium" },
  "statistics": { "total_watches": 12 },
  "history": [
    { "movie": { "title": "The Shawshank Redemption", "rating": 9.3 } }
  ]
}
```

---

### 3. Movie Reviews

**GET /api/movies/:id/reviews**

Response:

```json
{
  "movie_id": "xyz",
  "total_reviews": 5,
  "reviews": [
    { "rating": 9, "review_text": "Amazing movie!" }
  ]
}
```

---

### 4. Top Watched Movies

**GET /api/movies/top-watched**

Aggregation Example:

```javascript
[
  { $match: { watched_at: { $gte: daysAgo } } },
  { $group: { _id: '$movie_id', watch_count: { $sum: 1 } } },
  { $sort: { watch_count: -1 } },
  { $limit: 5 },
  { $lookup: { from: 'movies', localField: '_id', foreignField: '_id', as: 'movie' } }
]
```

---

### 5. Create Review

**POST /api/reviews**

```json
{
  "user_id": "...",
  "movie_id": "...",
  "rating": 8.5,
  "review_text": "Great movie!"
}
```

---

## Hybrid Search Algorithm

### Formula

```
Hybrid Score = (0.5 × Similarity) + (0.3 × Rating) + (0.2 × Popularity)
```

### Components

* Similarity: Levenshtein distance-based fuzzy matching
* Rating: Normalized (0–1)
* Popularity: log(watch_count + 1) / log(10000)

### Example

```
Similarity = 1.0
Rating = 0.92
Popularity = 0.80
Hybrid Score = 0.936
```

---

## Database Indexes

### Movies

```javascript
{ title: 'text', cast: 'text', directors: 'text' }
{ rating: -1 }
{ watch_count: -1 }
```

### Users

```javascript
{ email: 1, unique: true }
{ subscription_type: 1 }
```

### Watch History

```javascript
{ user_id: 1, watched_at: -1 }
{ movie_id: 1 }
```

### Reviews

```javascript
{ user_id: 1, movie_id: 1, unique: true }
{ movie_id: 1, created_at: -1 }
