import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import MultiSiteScraper from './scraper.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize scraper
const scraper = new MultiSiteScraper();

// API Key authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  
  next();
};

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Multi-Site E-Commerce Scraper API',
    version: '2.0.0',
    endpoints: {
      search: 'POST /api/scrape/search',
      product: 'POST /api/scrape/product',
      cache: 'POST /api/cache/clear'
    },
    documentation: 'See README.md for usage instructions'
  });
});

/**
 * Search products endpoint
 * POST /api/scrape/search
 * Body: {
 *   siteConfig: {
 *     name: "Site Name",
 *     searchUrl: "https://example.com/search?q={query}",
 *     selectors: {
 *       productCard: ".product",
 *       title: ".title",
 *       price: ".price",
 *       image: "img",
 *       link: "a"
 *     }
 *   },
 *   query: "search term",
 *   page: 1
 * }
 */
app.post('/api/scrape/search', authenticate, async (req, res) => {
  try {
    const { siteConfig, query, page = 1 } = req.body;

    // Validate request
    if (!siteConfig || !query) {
      return res.status(400).json({ 
        error: 'Missing required fields: siteConfig and query' 
      });
    }

    // Validate site config
    const requiredFields = ['name', 'searchUrl', 'selectors'];
    const requiredSelectors = ['productCard', 'title', 'price', 'image', 'link'];
    
    for (const field of requiredFields) {
      if (!siteConfig[field]) {
        return res.status(400).json({ 
          error: `Missing required field in siteConfig: ${field}` 
        });
      }
    }

    for (const selector of requiredSelectors) {
      if (!siteConfig.selectors[selector]) {
        return res.status(400).json({ 
          error: `Missing required selector: ${selector}` 
        });
      }
    }

    // Scrape the site
    const results = await scraper.search(siteConfig, query, page);
    res.json(results);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Scraping failed', 
      message: error.message 
    });
  }
});

/**
 * Get product details endpoint
 * POST /api/scrape/product
 * Body: {
 *   siteConfig: { name: "Site Name" },
 *   productUrl: "https://example.com/product/123",
 *   selectors: {
 *     title: "h1.title",
 *     price: ".price",
 *     description: ".description",
 *     images: "img.product-image"
 *   }
 * }
 */
app.post('/api/scrape/product', authenticate, async (req, res) => {
  try {
    const { siteConfig, productUrl, selectors } = req.body;

    if (!siteConfig || !productUrl || !selectors) {
      return res.status(400).json({ 
        error: 'Missing required fields: siteConfig, productUrl, and selectors' 
      });
    }

    const product = await scraper.getProductDetails(siteConfig, productUrl, selectors);
    res.json(product);

  } catch (error) {
    console.error('Product details error:', error);
    res.status(500).json({ 
      error: 'Failed to get product details', 
      message: error.message 
    });
  }
});

/**
 * Clear cache endpoint
 * POST /api/cache/clear
 */
app.post('/api/cache/clear', authenticate, (req, res) => {
  scraper.clearCache();
  res.json({ 
    success: true, 
    message: 'Cache cleared successfully' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Multi-Site Scraper API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing scraper...');
  await scraper.close();
  process.exit(0);
});
