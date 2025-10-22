DataBase Schemas

movies:

{
  _id: ObjectId,
  title: String,
  year: Number,
  genres: [String],
  cast: [String],
  directors: [String],
  rating: Number,        // 0-10 scale
  watch_count: Number    // Total views
}

users:

{
  _id: ObjectId,
  name: String,
  email: String,         // Unique
  subscription_type: String,  // "basic", "premium", "vip"
  created_at: Date
}

watch_history:

{
  _id: ObjectId,
  user_id: ObjectId,     // Reference to users
  movie_id: ObjectId,    // Reference to movies
  watched_at: Date,
  watch_duration: Number  // Minutes watched
}

reviews:

{
  _id: ObjectId,
  user_id: ObjectId,     // Reference to users
  movie_id: ObjectId,    // Reference to movies
  rating: Number,        // 1-10 scale
  review_text: String,
  created_at: Date
}