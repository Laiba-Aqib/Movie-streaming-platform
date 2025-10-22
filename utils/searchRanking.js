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

function calculateSimilarity(query, text) {
  if (!text) return 0;
  
  query = query.toLowerCase().trim();
  text = text.toLowerCase().trim();
  
  if (text.includes(query)) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(query, text);
  const maxLength = Math.max(query.length, text.length);
  const similarity = 1 - (distance / maxLength);
  
  return Math.max(0, similarity);
}

function calculateTitleSimilarity(movie, query) {
  return calculateSimilarity(query, movie.title);
}

function calculateCastDirectorScore(movie, query) {
  let maxSimilarity = 0;
  
  if (movie.cast && Array.isArray(movie.cast)) {
    for (const actor of movie.cast) {
      const similarity = calculateSimilarity(query, actor);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  if (movie.directors && Array.isArray(movie.directors)) {
    for (const director of movie.directors) {
      const similarity = calculateSimilarity(query, director);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
  }
  
  return maxSimilarity;
}

function normalizeRating(rating) {
  if (!rating || rating < 0) return 0;
  return Math.min(rating / 10, 1);
}

function normalizePopularity(watchCount) {
  if (!watchCount || watchCount < 0) return 0;
  const normalized = Math.log(watchCount + 1) / Math.log(10000);
  return Math.min(normalized, 1);
}

function calculateHybridScore(movie, query) {
  const WEIGHT_SIMILARITY = 0.5;
  const WEIGHT_RATING = 0.3;
  const WEIGHT_POPULARITY = 0.2;
  
  const titleSim = calculateTitleSimilarity(movie, query);
  const castDirSim = calculateCastDirectorScore(movie, query);
  const similarityScore = Math.max(titleSim, castDirSim);
  
  const ratingScore = normalizeRating(movie.rating || 0);
  const popularityScore = normalizePopularity(movie.watch_count || 0);
  
  return (
    (WEIGHT_SIMILARITY * similarityScore) +
    (WEIGHT_RATING * ratingScore) +
    (WEIGHT_POPULARITY * popularityScore)
  );
}

module.exports = {
  calculateHybridScore,
  calculateSimilarity,
  levenshteinDistance,
  normalizeRating,
  normalizePopularity
};
