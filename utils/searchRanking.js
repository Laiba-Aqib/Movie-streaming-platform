/**
 * Hybrid Search Ranking Algorithm
 * Weighted formula: 50% similarity + 30% rating + 20% popularity
 */

/**
 * Calculate Levenshtein distance (edit distance) between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  str1 = str1.toLowerCase();
  str2 = str2.toLowerCase();
  
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
function calculateSimilarity(query, text) {
  if (!text) return 0;
  
  query = query.toLowerCase().trim();
  text = text.toLowerCase().trim();
  
  // Exact match
  if (text.includes(query)) {
    return 1.0;
  }
  
  // Calculate distance
  const distance = levenshteinDistance(query, text);
  const maxLength = Math.max(query.length, text.length);
  
  // Normalize to 0-1 (1 = perfect match, 0 = completely different)
  const similarity = 1 - (distance / maxLength);
  
  return Math.max(0, similarity);
}

/**
 * Calculate title similarity score
 * Checks if query matches title, including fuzzy matching
 */
function calculateTitleSimilarity(movie, query) {
  const titleSimilarity = calculateSimilarity(query, movie.title);
  return titleSimilarity;
}

/**
 * Calculate cast/director match score
 */
function calculateCastDirectorScore(movie, query) {
  let maxSimilarity = 0;
  
  // Check cast members
  if (movie.cast && Array.isArray(movie.cast)) {
    for (const actor of movie.cast) {
      const similarity = calculateSimilarity(query, actor);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  // Check directors
  if (movie.directors && Array.isArray(movie.directors)) {
    for (const director of movie.directors) {
      const similarity = calculateSimilarity(query, director);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  return maxSimilarity;
}

/**
 * Normalize rating to 0-1 scale
 * Assuming ratings are 0-10
 */
function normalizeRating(rating) {
  if (!rating || rating < 0) return 0;
  return Math.min(rating / 10, 1);
}

/**
 * Normalize popularity (watch count) to 0-1 scale
 * Using logarithmic scaling for better distribution
 */
function normalizePopularity(watchCount) {
  if (!watchCount || watchCount < 0) return 0;
  // Log scale: log(count + 1) / log(max_expected)
  // Assuming max watch count might be around 10000
  const normalized = Math.log(watchCount + 1) / Math.log(10000);
  return Math.min(normalized, 1);
}

/**
 * Calculate hybrid score with weighted formula
 * Weights: 50% similarity + 30% rating + 20% popularity
 */
function calculateHybridScore(movie, query) {
  const WEIGHT_SIMILARITY = 0.5;
  const WEIGHT_RATING = 0.3;
  const WEIGHT_POPULARITY = 0.2;
  
  // 1. Similarity Score (title + cast/director)
  const titleSim = calculateTitleSimilarity(movie, query);
  const castDirSim = calculateCastDirectorScore(movie, query);
  const similarityScore = Math.max(titleSim, castDirSim);
  
  // 2. Rating Score (normalized)
  const ratingScore = normalizeRating(movie.rating || 0);
  
  // 3. Popularity Score (normalized watch count)
  const popularityScore = normalizePopularity(movie.watch_count || 0);
  
  // Calculate weighted hybrid score
  const hybridScore = 
    (WEIGHT_SIMILARITY * similarityScore) +
    (WEIGHT_RATING * ratingScore) +
    (WEIGHT_POPULARITY * popularityScore);
  
  return hybridScore;
}

module.exports = {
  calculateHybridScore,
  calculateSimilarity,
  levenshteinDistance,
  normalizeRating,
  normalizePopularity
}