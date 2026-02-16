[README.md](https://github.com/user-attachments/files/25343379/README.md)
# Multi-Site E-Commerce Scraper API

A flexible, configurable scraper API that works with any e-commerce website. Configure sites dynamically through your frontend app without redeploying.

## Features

- ✅ **Dynamic Site Configuration** - Add new sites without code changes
- ✅ **Generic Scraper Engine** - Works with any e-commerce site
- ✅ **Pre-configured Templates** - Ready-to-use configs for popular sites
- ✅ **Smart Caching** - 1-hour cache for fast responses
- ✅ **API Key Authentication** - Secure access control
- ✅ **Easy Deployment** - Railway/Render ready

## Quick Start

### Deploy to Railway

1. Push to GitHub
2. Connect to Railway
3. Add environment variable: `API_KEY=your_secret_key`
4. Deploy!

Your API will be live at: `https://your-app.up.railway.app`

## API Endpoints

### 1. Search Products

**Endpoint:** `POST /api/scrape/search`

**Request:**
```json
{
  "siteConfig": {
    "name": "Tool Station",
    "searchUrl": "https://www.toolstation.com/search?q={query}",
    "selectors": {
      "productCard": "[class*='product']",
      "title": "h2",
      "price": "[class*='price']",
      "image": "img",
      "link": "a"
    }
  },
  "query": "drill",
  "page": 1
}
```

**Response:**
```json
{
  "site": "Tool Station",
  "query": "drill",
  "page": 1,
  "totalResults": 24,
  "results": [
    {
      "productCode": "60545",
      "title": "DeWalt Drill",
      "brand": "DeWalt",
      "price": "£119.98",
      "rating": "5",
      "image": "https://...",
      "url": "https://..."
    }
  ],
  "cached": false,
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

### 2. Get Product Details

**Endpoint:** `POST /api/scrape/product`

**Request:**
```json
{
  "siteConfig": {
    "name": "Tool Station"
  },
  "productUrl": "https://www.toolstation.com/product/123",
  "selectors": {
    "title": "h1",
    "price": ".price",
    "description": ".description",
    "images": "img.product-image"
  }
}
```

### 3. Clear Cache

**Endpoint:** `POST /api/cache/clear`

## Pre-configured Site Templates

The API includes templates for popular sites:

- **Tool Station** - UK tools and hardware
- **Screwfix** - UK tools and building supplies
- **Amazon** - Global marketplace
- **Generic** - Template for any e-commerce site

See `site-templates.json` for full configurations.

## How to Add a New Site

### Option 1: Use in Your Lovable App

Store site configurations in your Lovable app's database and send them with each request:

```typescript
// In your Lovable app
const siteConfig = {
  name: "New Site",
  searchUrl: "https://newsite.com/search?q={query}",
  selectors: {
    productCard: ".product",
    title: ".product-title",
    price: ".price",
    image: "img.product-img",
    link: "a.product-link"
  }
};

const response = await fetch('https://your-api.up.railway.app/api/scrape/search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'your_api_key',
  },
  body: JSON.stringify({
    siteConfig,
    query: 'search term',
    page: 1
  }),
});
```

### Option 2: Find CSS Selectors

1. **Open the site** in your browser
2. **Right-click** on a product → "Inspect"
3. **Find the selectors:**
   - Product card container
   - Title element
   - Price element
   - Image element
   - Link element

4. **Test the selectors** in browser console:
```javascript
document.querySelectorAll('.product-card') // Should return product cards
```

## Authentication

All endpoints (except `/`) require API key authentication:

```bash
curl -X POST https://your-api.up.railway.app/api/scrape/search \
  -H "x-api-key: your_secret_key" \
  -H "Content-Type: application/json" \
  -d '{"siteConfig": {...}, "query": "drill"}'
```

## Environment Variables

- `API_KEY` - Your secret API key (required)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (production/development)

## Caching

- Results are cached for 1 hour
- Cache key: `siteName:query:page`
- Clear cache: `POST /api/cache/clear`

## Error Handling

**401 Unauthorized:**
```json
{
  "error": "Unauthorized: Invalid API key"
}
```

**400 Bad Request:**
```json
{
  "error": "Missing required fields: siteConfig and query"
}
```

**500 Server Error:**
```json
{
  "error": "Scraping failed",
  "message": "Failed to scrape Site Name: timeout"
}
```

## Limitations

- **Anti-bot measures** - Some sites block automated access
- **Dynamic content** - Sites with heavy JavaScript may need longer wait times
- **Rate limiting** - Add delays between requests to avoid being blocked
- **Selector changes** - Sites may update their HTML structure

## Tips for Success

1. **Test selectors** in browser console first
2. **Use specific selectors** - More specific = more reliable
3. **Handle failures gracefully** - Sites may change or block scrapers
4. **Cache aggressively** - Reduce load and avoid being blocked
5. **Add delays** - Don't hammer sites with requests

## Integration with Lovable

See the included Lovable integration guide for:
- Setting up scraper configuration UI
- Storing site configs in database
- Building product search interface
- Handling errors and loading states

## Support

For issues or questions:
1. Check Railway logs for errors
2. Test selectors in browser console
3. Verify site structure hasn't changed
4. Try with a different site to isolate the issue

## License

MIT
