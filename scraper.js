import puppeteer from 'puppeteer';

class MultiSiteScraper {
  constructor() {
    this.browser = null;
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled'
        ]
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getCacheKey(siteConfig, query, page) {
    return `${siteConfig.name}:${query}:${page}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Search products on any e-commerce site
   * @param {Object} siteConfig - Site configuration
   * @param {string} siteConfig.name - Site name
   * @param {string} siteConfig.searchUrl - Search URL template with {query} placeholder
   * @param {Object} siteConfig.selectors - CSS selectors for scraping
   * @param {string} siteConfig.selectors.productCard - Selector for product cards
   * @param {string} siteConfig.selectors.title - Selector for product title
   * @param {string} siteConfig.selectors.price - Selector for product price
   * @param {string} siteConfig.selectors.image - Selector for product image
   * @param {string} siteConfig.selectors.link - Selector for product link
   * @param {string} siteConfig.selectors.brand - (Optional) Selector for brand
   * @param {string} siteConfig.selectors.rating - (Optional) Selector for rating
   * @param {string} query - Search query
   * @param {number} page - Page number
   */
  async search(siteConfig, query, page = 1) {
    // Check cache
    const cacheKey = this.getCacheKey(siteConfig, query, page);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    await this.init();
    const browserPage = await this.browser.newPage();

    try {
      // Set viewport and user agent
      await browserPage.setViewport({ width: 1920, height: 1080 });
      await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Build search URL
      const searchUrl = siteConfig.searchUrl.replace('{query}', encodeURIComponent(query));
      
      // Navigate to search page
      await browserPage.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for products to load
      await browserPage.waitForSelector(siteConfig.selectors.productCard, { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract products
      const products = await browserPage.evaluate((selectors) => {
        const productCards = Array.from(document.querySelectorAll(selectors.productCard));
        
        return productCards.map(card => {
          const getTextContent = (selector) => {
            const el = card.querySelector(selector);
            return el ? el.textContent.trim() : null;
          };

          const getAttribute = (selector, attr) => {
            const el = card.querySelector(selector);
            return el ? el.getAttribute(attr) : null;
          };

          const title = getTextContent(selectors.title);
          const price = getTextContent(selectors.price);
          
          // Get image - try src first, then data-src
          let image = getAttribute(selectors.image, 'src');
          if (!image || image.includes('data:image')) {
            image = getAttribute(selectors.image, 'data-src');
          }

          // Get link - try href, or construct from data attributes
          let link = getAttribute(selectors.link, 'href');
          if (link && !link.startsWith('http')) {
            link = window.location.origin + link;
          }

          // Optional fields
          const brand = selectors.brand ? getTextContent(selectors.brand) : null;
          const rating = selectors.rating ? getTextContent(selectors.rating) : null;

          // Extract product code from URL if possible
          let productCode = null;
          if (link) {
            const codeMatch = link.match(/\/p([A-Z0-9]+)/i) || link.match(/product[\/\-]([A-Z0-9]+)/i);
            productCode = codeMatch ? codeMatch[1] : null;
          }

          return {
            productCode,
            title,
            brand,
            price,
            rating,
            image,
            url: link
          };
        }).filter(p => p.title && p.price); // Only return products with at least title and price
      }, siteConfig.selectors);

      const result = {
        site: siteConfig.name,
        query,
        page,
        totalResults: products.length,
        results: products,
        cached: false,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.setCache(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape ${siteConfig.name}: ${error.message}`);
    } finally {
      await browserPage.close();
    }
  }

  /**
   * Get product details from any e-commerce site
   * @param {Object} siteConfig - Site configuration
   * @param {string} productUrl - Full product URL
   * @param {Object} detailSelectors - CSS selectors for product details page
   */
  async getProductDetails(siteConfig, productUrl, detailSelectors) {
    await this.init();
    const browserPage = await this.browser.newPage();

    try {
      await browserPage.setViewport({ width: 1920, height: 1080 });
      await browserPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await browserPage.goto(productUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));

      const product = await browserPage.evaluate((selectors) => {
        const getTextContent = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const getAttribute = (selector, attr) => {
          const el = document.querySelector(selector);
          return el ? el.getAttribute(attr) : null;
        };

        const getAllImages = (selector) => {
          const images = Array.from(document.querySelectorAll(selector));
          return images.map(img => img.src || img.getAttribute('data-src')).filter(Boolean);
        };

        return {
          title: getTextContent(selectors.title),
          price: getTextContent(selectors.price),
          description: selectors.description ? getTextContent(selectors.description) : null,
          brand: selectors.brand ? getTextContent(selectors.brand) : null,
          rating: selectors.rating ? getTextContent(selectors.rating) : null,
          images: selectors.images ? getAllImages(selectors.images) : [],
          availability: selectors.availability ? getTextContent(selectors.availability) : null,
        };
      }, detailSelectors);

      return {
        site: siteConfig.name,
        url: productUrl,
        ...product,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Product details error:', error);
      throw new Error(`Failed to get product details: ${error.message}`);
    } finally {
      await browserPage.close();
    }
  }
}

export default MultiSiteScraper;
