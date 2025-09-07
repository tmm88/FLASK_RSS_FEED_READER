# This file makes the 'feeds' folder a Python package
# and makes all feed category modules accessible.
from feeds import general_news
from feeds import portuguese_news
from feeds import tech_music
from feeds import amazon_news
from feeds import linux_distrowatch
from feeds import medium

# Create a list of all available feeds
feeds = [
    ("General News", general_news.feeds),
    ("Portuguese News", portuguese_news.feeds),
    ("Tech & Music", tech_music.feeds),
    ("Amazon News", amazon_news.feeds),
    ("Linux Distrowatch", linux_distrowatch.feeds),
    ("Medium", medium.feeds)
]

from flask import Flask, render_template, jsonify
import feedparser
import random
import re

app = Flask(__name__)

class RandomFeedReader:
    def __init__(self, feeds, items_per_feed=3):
        self.feeds = feeds
        self.items_per_feed = items_per_feed
        self.last_feed = None

    def pick_random_feed(self):
        while True:
            category_name, category_feeds = random.choice(self.feeds)
            feed_name, feed_url = random.choice(category_feeds)
            if (category_name, feed_name) != self.last_feed:
                self.last_feed = (category_name, feed_name)
                return category_name, feed_name, feed_url

    def fetch_random_news(self, feed_url):
        parsed = feedparser.parse(feed_url)
        if not parsed.entries:
            return []
        return random.sample(parsed.entries, min(self.items_per_feed, len(parsed.entries)))

reader = RandomFeedReader(feeds)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/news")
def news():
    category, feed_name, feed_url = reader.pick_random_feed()
    news_items = reader.fetch_random_news(feed_url)
    
    result = []
    for item in news_items:
        preview = getattr(item, "summary", "")
        preview_text = re.sub('<[^<]+?>', '', preview)  # remove HTML tags
        result.append({
            "title": item.title,
            "link": getattr(item, "link", "#"),
            "preview": preview_text[:150] + ("..." if len(preview_text) > 150 else "")
        })
    return jsonify({
        "category": category,
        "feed_name": feed_name,
        "items": result
    })

if __name__ == "__main__":
    app.run(debug=True)