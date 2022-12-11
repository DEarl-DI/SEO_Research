const puppeteer = require('puppeteer');
const natural = require('natural');
const url = process.argv[2];

// Crawl the website and extract the text content from each page
async function crawlWebsite(url) {
    console.log(`Crawling website: ${url}`);

    // Create a new browser and page instance
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the given url
    await page.goto(url, { waitUntil: 'networkidle0' });

    // Gather all the links on the page
    const links = await page.evaluate(() => {
        const linkElements = document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(el => el.getAttribute('href'));
    });

    // Filter out invalid URLs
    const validLinks = links.filter(link => {
        try {
            const myURL = new URL(link);
            return !!myURL.protocol && !!myURL.host;
        } catch (error) {
            return false;
        }
    });

    // Gather the text content from each page
    const textByPage = {};
    for (const link of validLinks) {
        // Navigate to the page
        await page.goto(link, { waitUntil: 'networkidle0' });

        // Extract the text content from the page
        const text = await page.evaluate(() => {
            // Select the elements to extract text from
            const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6');

            // Extract the text content from each element
            return Array.from(elements).map(el => el.innerText).join('\n');
        });

        // Save the text content for the page
        textByPage[link] = text;
    }

    // Close the browser
    await browser.close();

    return textByPage;
}

// Predict the most relevant keywords for the website
async function predictKeywords(textByPage) {
    console.log(`Predicting keywords for website: ${url}`);

    // Create a new instance of the natural TfIdf class
    const tfidf = new natural.TfIdf();

    // Add the text from each page to the TfIdf object
    for (const [page, text] of Object.entries(textByPage)) {
        tfidf.addDocument(text);
    }

    // Compute the tf-idf values for each word in the text
    const keywords = tfidf
        .listTerms(0)
        .sort((a, b) => b.tfidf - a.tfidf)
        .map(term => term.term);

    // Return the top N keywords
    const N = 10;
    return keywords.slice(0, N);
}

// Generate variations of the keywords
async function generateVariations(keywords) {
    // Create a new instance of the natural WordNet class
    const wordnet = new natural.WordNet();

    // Create a set to store the variations
    const variations = new Set();

    // Generate variations for each keyword
    for (const keyword of keywords) {
        // Look up the synonyms for the keyword
        const results = await wordnet.lookup(keyword);

        // Add each synonym to the set of variations
        for (const result of results) {
            variations.add(result.synonym);
        }
    }

    return Array.from(variations);
}


async function main() {
    // Get the URL from the command-line arguments
    const url = process.argv[2];

    // Crawl the website and extract the text content from each page
    const textByPage = await crawlWebsite(url);

    // Predict the most relevant keywords for the website
    const keywords = await predictKeywords(textByPage);
    console.log('The most relevant keywords for the website are:', `${keywords.join(', ')}`);

    // Generate variations of the keywords
    // const variations = await generateVariations(keywords);
    // console.log('The variations of the keywords are:', `${[...variations].join(', ')}`);

}


main();
