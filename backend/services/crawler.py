import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

def scrape_url(url: str) -> dict:
    """
    Fetches a URL and extracts the main text content.
    Returns a dict with 'title', 'text', and 'source'.
    """
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        # Get title
        title = soup.title.string if soup.title else url
        title = title.strip()
        
        # Get text
        text = soup.get_text(separator='\n')
        
        # Clean text (remove excessive newlines)
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return {
            "title": title,
            "text": text,
            "source": url
        }
    except Exception as e:
        raise ValueError(f"Failed to scrape URL: {str(e)}")

def is_valid_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme, result.netloc])
    except:
        return False
