from feeds import general_news, portuguese_news, tech_music, amazon_news, linux_distrowatch, medium
from flask import Flask, render_template, jsonify
import feedparser
import random
import re
from cachetools import TTLCache
from datetime import datetime
import bleach

app = Flask(__name__)

# Define available feeds with their respective modules
FEEDS = [
    ("General News", general_news.feeds),
    ("Portuguese News", portuguese_news.feeds),
    ("Tech & Music", tech_music.feeds),
    ("Amazon News", amazon_news.feeds),
    ("Linux Distrowatch", linux_distrowatch.feeds),
    ("Medium", medium.feeds)
]

class RandomFeedReader:
    def __init__(self, feeds, items_per_feed=3, cache_ttl=300):
        self.feeds = feeds
        self.items_per_feed = items_per_feed
        self.last_feed = None
        # Cache feeds for 5 minutes to reduce API calls
        self.cache = TTLCache(maxsize=100, ttl=cache_ttl)

    def pick_random_feed(self):
        """Select a random feed different from the last one."""
        while True:
            category_name, category_feeds = random.choice(self.feeds)
            feed_name, feed_url = random.choice(category_feeds)
            if (category_name, feed_name) != self.last_feed:
                self.last_feed = (category_name, feed_name)
                return category_name, feed_name, feed_url

    def _clean_preview(self, text):
        """Clean and truncate preview text."""
        # Remove HTML tags and clean potentially dangerous content
        cleaned = bleach.clean(
            text,
            tags=[],
            strip=True
        )
        # Remove extra whitespace and truncate
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()
        return cleaned[:150] + ("..." if len(cleaned) > 150 else "")

    def fetch_random_news(self, feed_url):
        """Fetch and process news items from a feed URL."""
        try:
            # Check cache first
            cache_key = f"{feed_url}_{self.items_per_feed}"
            if cache_key in self.cache:
                return self.cache[cache_key]

            parsed = feedparser.parse(feed_url)
            if not parsed.entries or parsed.get('bozo', 0) == 1:
                return []

            # Process feed entries
            entries = random.sample(
                parsed.entries,
                min(self.items_per_feed, len(parsed.entries))
            )
            
            result = [{
                "title": item.get('title', 'No title'),
                "link": item.get('link', '#'),
                "preview": self._clean_preview(item.get('summary', '')),
                "published": self._parse_date(item.get('published', ''))
            } for item in entries]

            # Cache the result
            self.cache[cache_key] = result
            return result

        except Exception as e:
            app.logger.error(f"Error fetching feed {feed_url}: {str(e)}")
            return []

    def _parse_date(self, date_str):
        """Parse and format date string."""
        try:
            parsed_date = feedparser._parse_date(date_str)
            return datetime(*parsed_date[:6]).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return ''

reader = RandomFeedReader(FEEDS)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/news")
def news():
    try:
        category, feed_name, feed_url = reader.pick_random_feed()
        news_items = reader.fetch_random_news(feed_url)
        
        return jsonify({
            "category": category,
            "feed_name": feed_name,
            "items": news_items,
            "status": "success"
        })
    except Exception as e:
        app.logger.error(f"Error in news endpoint: {str(e)}")
        return jsonify({
            "category": "",
            "feed_name": "",
            "items": [],
            "status": "error",
            "error": "Failed to fetch news"
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)