
// Function to fetch and extract text content from a website
export const scrapeWebsite = async (url: string): Promise<string> => {
  try {
    // Check if URL has protocol, add if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    // This is just a client-side example - for production use, you would use a proxy server or API
    // We'll implement a simple browser-based scrape using fetch and DOMParser
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/html',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.status}`);
    }
    
    const data = await response.json();
    const html = data.contents;
    
    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Extract text content
    const textContent = extractText(doc);
    
    // Limit to first 1000 words
    const words = textContent.split(/\s+/);
    return words.slice(0, 1000).join(' ');
    
  } catch (error) {
    console.error('Error scraping website:', error);
    return `Failed to scrape: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

// Helper function to extract text from DOM
const extractText = (doc: Document): string => {
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style, noscript, iframe, svg');
  scripts.forEach(script => script.remove());
  
  // Get text from body
  const body = doc.body;
  if (!body) return '';
  
  // Extract text from visible elements
  const elements = body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, a, div');
  let text = '';
  
  elements.forEach(el => {
    // Skip hidden elements
    const style = window.getComputedStyle(el);
    if (style && style.display === 'none' || style.visibility === 'hidden') {
      return;
    }
    
    const content = el.textContent?.trim();
    if (content && content.length > 0) {
      text += content + ' ';
    }
  });
  
  // Clean up text
  return text
    .replace(/\s+/g, ' ')
    .trim();
};

export const batchScrapeWebsites = async (
  urls: string[], 
  progressCallback: (progress: number) => void
): Promise<Record<string, string>> => {
  const results: Record<string, string> = {};
  let completed = 0;
  
  // Process in sequence to avoid overloading
  for (const url of urls) {
    try {
      results[url] = await scrapeWebsite(url);
    } catch (error) {
      results[url] = `Error: ${error instanceof Error ? error.message : 'Failed to scrape'}`;
    }
    
    completed++;
    progressCallback(Math.floor((completed / urls.length) * 100));
  }
  
  return results;
};
