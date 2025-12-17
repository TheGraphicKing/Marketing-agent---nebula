/**
 * Web Scraping Service
 * Responsible scraping with rate limiting, caching, and robots.txt compliance
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// In-memory cache (in production, use Redis)
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Rate limiting per domain
const domainLastRequest = new Map();
const RATE_LIMIT_MS = 2000; // 2 seconds between requests to same domain

// Robots.txt cache
const robotsCache = new Map();

// Data source registry for tracking
const dataSourceRegistry = [];

/**
 * Log a scrape operation
 */
function logScrape(url, success, cached, duration, error = null) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    type: 'scrape',
    url: url.substring(0, 100),
    success,
    cached,
    durationMs: duration,
    error: error ? error.message : null
  }));
}

/**
 * Register a data source
 */
function registerDataSource(url, dataType, data) {
  const entry = {
    id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url,
    dataType,
    timestamp: new Date().toISOString(),
    dataPreview: typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200)
  };
  dataSourceRegistry.push(entry);
  
  // Keep only last 1000 entries
  if (dataSourceRegistry.length > 1000) {
    dataSourceRegistry.shift();
  }
  
  return entry.id;
}

/**
 * Get data source by ID
 */
function getDataSource(id) {
  return dataSourceRegistry.find(s => s.id === id);
}

/**
 * Get all data sources for a URL
 */
function getDataSourcesForUrl(url) {
  return dataSourceRegistry.filter(s => s.url === url);
}

/**
 * Simple HTTP fetch with timeout
 */
function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'GravityMarketingBot/1.0 (Educational/Research; +https://gravity.ai)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        ...options.headers
      },
      timeout: options.timeout || 15000
    };
    
    const req = protocol.request(reqOptions, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).toString();
        fetchUrl(redirectUrl, options).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

/**
 * Check robots.txt for a domain
 */
async function checkRobotsTxt(domain) {
  if (robotsCache.has(domain)) {
    return robotsCache.get(domain);
  }
  
  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const content = await fetchUrl(robotsUrl, { timeout: 5000 });
    
    // Parse robots.txt (simple implementation)
    const rules = {
      allowed: true,
      disallowedPaths: [],
      crawlDelay: 0
    };
    
    const lines = content.split('\n');
    let inUserAgentBlock = false;
    
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const agent = trimmed.split(':')[1].trim();
        inUserAgentBlock = agent === '*' || agent.includes('bot');
      }
      
      if (inUserAgentBlock) {
        if (trimmed.startsWith('disallow:')) {
          const path = trimmed.split(':')[1].trim();
          if (path === '/') {
            rules.allowed = false;
          } else if (path) {
            rules.disallowedPaths.push(path);
          }
        }
        
        if (trimmed.startsWith('crawl-delay:')) {
          rules.crawlDelay = parseInt(trimmed.split(':')[1].trim()) || 0;
        }
      }
    }
    
    robotsCache.set(domain, rules);
    return rules;
  } catch (error) {
    // If robots.txt not found, assume allowed
    const rules = { allowed: true, disallowedPaths: [], crawlDelay: 0 };
    robotsCache.set(domain, rules);
    return rules;
  }
}

/**
 * Check if a URL is allowed to be scraped
 */
async function isAllowed(url) {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname;
    const path = parsedUrl.pathname;
    
    const rules = await checkRobotsTxt(domain);
    
    if (!rules.allowed) {
      return { allowed: false, reason: 'Blocked by robots.txt (disallow all)' };
    }
    
    for (const disallowed of rules.disallowedPaths) {
      if (path.startsWith(disallowed)) {
        return { allowed: false, reason: `Blocked by robots.txt (${disallowed})` };
      }
    }
    
    return { allowed: true, crawlDelay: rules.crawlDelay };
  } catch (error) {
    return { allowed: true, crawlDelay: 0 }; // Default to allowed on error
  }
}

/**
 * Rate limit requests to a domain
 */
async function rateLimitDomain(domain, crawlDelay = 0) {
  const minDelay = Math.max(RATE_LIMIT_MS, crawlDelay * 1000);
  const lastRequest = domainLastRequest.get(domain) || 0;
  const elapsed = Date.now() - lastRequest;
  
  if (elapsed < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
  }
  
  domainLastRequest.set(domain, Date.now());
}

/**
 * Get from cache
 */
function getFromCache(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(url);
  return null;
}

/**
 * Set cache
 */
function setCache(url, data) {
  cache.set(url, { data, timestamp: Date.now() });
}

/**
 * Main scrape function with retry and exponential backoff
 */
async function scrape(url, options = {}) {
  const startTime = Date.now();
  const maxRetries = options.maxRetries || 3;
  
  // Check cache first
  const cached = getFromCache(url);
  if (cached && !options.forceRefresh) {
    logScrape(url, true, true, Date.now() - startTime);
    return { success: true, data: cached, cached: true, url };
  }
  
  // Check robots.txt
  const allowCheck = await isAllowed(url);
  if (!allowCheck.allowed) {
    logScrape(url, false, false, Date.now() - startTime, new Error(allowCheck.reason));
    return { 
      success: false, 
      error: allowCheck.reason, 
      errorType: 'robots_blocked',
      url 
    };
  }
  
  const parsedUrl = new URL(url);
  const domain = parsedUrl.hostname;
  
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Rate limit
      await rateLimitDomain(domain, allowCheck.crawlDelay);
      
      const data = await fetchUrl(url, options);
      
      // Cache the result
      setCache(url, data);
      
      // Register data source
      const sourceId = registerDataSource(url, 'html', data);
      
      logScrape(url, true, false, Date.now() - startTime);
      
      return { 
        success: true, 
        data, 
        cached: false, 
        url,
        sourceId,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      lastError = error;
      
      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logScrape(url, false, false, Date.now() - startTime, lastError);
  
  let errorType = 'unknown';
  if (lastError.message.includes('timeout')) errorType = 'timeout';
  else if (lastError.message.includes('ENOTFOUND')) errorType = 'dns_error';
  else if (lastError.message.includes('ECONNREFUSED')) errorType = 'connection_refused';
  else if (lastError.message.includes('HTTP 4')) errorType = 'client_error';
  else if (lastError.message.includes('HTTP 5')) errorType = 'server_error';
  else if (lastError.message.includes('HTTP 429')) errorType = 'rate_limited';
  
  return { 
    success: false, 
    error: lastError.message, 
    errorType,
    url 
  };
}

/**
 * Parse HTML and extract content
 */
function parseHTML(html) {
  // Remove scripts, styles, and comments
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';
  
  // Extract meta description
  const descMatch = cleaned.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                    cleaned.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const description = descMatch ? descMatch[1].trim() : '';
  
  // Extract meta keywords
  const keywordsMatch = cleaned.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [];
  
  // Extract headings
  const headings = [];
  const h1Matches = cleaned.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  for (const match of h1Matches) {
    headings.push({ level: 1, text: stripTags(match[1]).trim() });
  }
  const h2Matches = cleaned.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
  for (const match of h2Matches) {
    headings.push({ level: 2, text: stripTags(match[1]).trim() });
  }
  
  // Extract links
  const links = [];
  const linkMatches = cleaned.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of linkMatches) {
    links.push({ href: match[1], text: stripTags(match[2]).trim() });
  }
  
  // Extract main content (paragraphs)
  const paragraphs = [];
  const pMatches = cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const match of pMatches) {
    const text = stripTags(match[1]).trim();
    if (text.length > 50) { // Only meaningful paragraphs
      paragraphs.push(text);
    }
  }
  
  // Extract list items
  const listItems = [];
  const liMatches = cleaned.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  for (const match of liMatches) {
    const text = stripTags(match[1]).trim();
    if (text.length > 10) {
      listItems.push(text);
    }
  }
  
  // Get full text content
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : cleaned;
  const fullText = stripTags(bodyContent)
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50000); // Limit to 50k chars
  
  return {
    title,
    description,
    keywords,
    headings,
    links: links.slice(0, 100), // Limit links
    paragraphs: paragraphs.slice(0, 50), // Limit paragraphs
    listItems: listItems.slice(0, 50),
    fullText,
    wordCount: fullText.split(/\s+/).length
  };
}

/**
 * Strip HTML tags
 */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

/**
 * Scrape and parse a website
 */
async function scrapeWebsite(url, options = {}) {
  const result = await scrape(url, options);
  
  if (!result.success) {
    return result;
  }
  
  const parsed = parseHTML(result.data);
  
  return {
    ...result,
    parsed,
    raw: options.includeRaw ? result.data : undefined
  };
}

/**
 * Scrape multiple pages from a website
 */
async function scrapeWebsitePages(baseUrl, pages = ['/', '/about', '/pricing', '/blog', '/products', '/services']) {
  const results = [];
  const parsedBase = new URL(baseUrl);
  const baseOrigin = parsedBase.origin;
  
  for (const page of pages) {
    try {
      const fullUrl = new URL(page, baseOrigin).toString();
      const result = await scrapeWebsite(fullUrl);
      results.push({
        page,
        url: fullUrl,
        ...result
      });
    } catch (error) {
      results.push({
        page,
        url: new URL(page, baseOrigin).toString(),
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Search for news/articles (using public search APIs or RSS)
 */
async function searchNews(query, options = {}) {
  // Use Google News RSS as a legal source
  const encodedQuery = encodeURIComponent(query);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
  
  try {
    const result = await scrape(rssUrl);
    
    if (!result.success) {
      return result;
    }
    
    // Parse RSS
    const items = [];
    const itemMatches = result.data.matchAll(/<item>([\s\S]*?)<\/item>/gi);
    
    for (const match of itemMatches) {
      const itemContent = match[1];
      
      const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
      const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const sourceMatch = itemContent.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      
      items.push({
        title: titleMatch ? stripTags(titleMatch[1]).trim() : '',
        link: linkMatch ? linkMatch[1].trim() : '',
        publishedAt: pubDateMatch ? pubDateMatch[1].trim() : '',
        source: sourceMatch ? stripTags(sourceMatch[1]).trim() : 'Google News'
      });
    }
    
    // Register as data source
    const sourceId = registerDataSource(rssUrl, 'news_search', items);
    
    return {
      success: true,
      query,
      items: items.slice(0, options.limit || 20),
      sourceId,
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errorType: 'search_failed',
      query
    };
  }
}

/**
 * Fetch RSS feed
 */
async function fetchRSS(feedUrl) {
  const result = await scrape(feedUrl);
  
  if (!result.success) {
    return result;
  }
  
  const items = [];
  const itemMatches = result.data.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  
  for (const match of itemMatches) {
    const itemContent = match[1];
    
    const titleMatch = itemContent.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/i);
    const descMatch = itemContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const pubDateMatch = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    
    items.push({
      title: titleMatch ? stripTags(titleMatch[1]).trim() : '',
      link: linkMatch ? linkMatch[1].trim() : '',
      description: descMatch ? stripTags(descMatch[1]).trim().substring(0, 500) : '',
      publishedAt: pubDateMatch ? pubDateMatch[1].trim() : ''
    });
  }
  
  const sourceId = registerDataSource(feedUrl, 'rss', items);
  
  return {
    success: true,
    feedUrl,
    items,
    sourceId,
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Clear cache
 */
function clearCache(url = null) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}

/**
 * Get cache stats
 */
function getCacheStats() {
  return {
    size: cache.size,
    urls: Array.from(cache.keys())
  };
}

/**
 * Get all data sources
 */
function getAllDataSources() {
  return dataSourceRegistry;
}

module.exports = {
  scrape,
  scrapeWebsite,
  scrapeWebsitePages,
  parseHTML,
  searchNews,
  fetchRSS,
  isAllowed,
  checkRobotsTxt,
  registerDataSource,
  getDataSource,
  getDataSourcesForUrl,
  getAllDataSources,
  clearCache,
  getCacheStats,
  stripTags
};
