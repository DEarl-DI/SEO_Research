const puppeteer = require('puppeteer');
const fs = require('fs');

async function gatherSEOKeywords(url) {
  // Create a new browser and page instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to the given url
  await page.goto(url);

  // Gather all the SEO keywords on the page
  const keywords = await page.evaluate(() => {
    const keywordElements = document.querySelectorAll('[data-keyword]');
    return Array.from(keywordElements).map(el => el.getAttribute('data-keyword'));
  });

  // Close the browser
  await browser.close();

  return keywords;
}

async function gatherSEOKeywordsForAllPages(url) {
  // Create a new browser and page instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to the given url
  await page.goto(url);

  // Gather all the links on the page
  const links = await page.evaluate(() => {
    const linkElements = document.querySelectorAll('a[href]');
    return Array.from(linkElements).map(el => el.getAttribute('href'));
  });
  console.log('Found', links.length, 'links on the page');

  // Filter out invalid URLs
  const validLinks = links.filter(link => {
    try {
      const myURL = new URL(link);
      return !!myURL.protocol && !!myURL.host;
    } catch (error) {
      return false;
    }
  });
  console.log('Found', validLinks.length, 'valid links on the page');

  // Close the browser
  await browser.close();

  // Gather all the SEO keywords for each page
  const keywordsByPage = {};
  for (const link of validLinks) {
    const keywords = await gatherSEOKeywords(link);
    keywordsByPage[link] = keywords;
  }
  console.log('Found', keywords.length, 'keywords on', link);

  return keywordsByPage;
}

async function main(url) {
  // Verify that the URL is valid
  const myURL = new URL(url);
  if (!myURL.protocol || !myURL.host) {
    throw new Error('Invalid URL: ' + url);
  }

  // Gather the SEO keywords for all pages on the website
  const keywordsByPage = await gatherSEOKeywordsForAllPages(url);

  // Write the SEO keywords to a CSV file
  const rows = [];
  for (const [page, keywords] of Object.entries(keywordsByPage)) {
    for (const keyword of keywords) {
      rows.push([page, keyword]);
    }
  }

  const csv = rows.map(row => row.join(',')).join('\n');
  fs.writeFileSync('seo-keywords.csv', csv);
}

// Get the website to scrape from the command line argument
const url = process.argv[2];

main(url);