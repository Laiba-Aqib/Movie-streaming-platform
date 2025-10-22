const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const moviesRouter = require('./routes/movies');
const usersRouter = require('./routes/users');
const reviewsRouter = require('./routes/reviews');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/users', usersRouter);
app.use('/api/reviews', reviewsRouter);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Movie Streaming Platform API',
    version: '1.0.0',
    endpoints: {
      movies: {
        search: 'GET /api/movies/search?query=...',
        topWatched: 'GET /api/movies/top-watched?days=30',
        details: 'GET /api/movies/:id',
        reviews: 'GET /api/movies/:id/reviews'
      },
      users: {
        history: 'GET /api/users/:id/history',
        profile: 'GET /api/users/:id'
      },
      reviews: {
        create: 'POST /api/reviews',
        byMovie: 'GET /api/movies/:id/reviews'
      }
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
async function startServer() {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API documentation available at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Shutting down gracefully...');
  const { closeDB } = require('./config/database');
  await closeDB();
  process.exit(0);
});