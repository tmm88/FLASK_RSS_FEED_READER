let lastData = null; // Cache for last fetched data

async function loadNews() {
    const list = document.getElementById("news-list");
    const header = document.getElementById("feed-header");
    const errorMessage = document.getElementById("error-message");

    // Show loading state
    list.style.opacity = "0.5";
    header.innerText = "Loading...";
    if (errorMessage) errorMessage.style.display = "none";

    try {
        // Check if cached data exists and is recent (within 60 seconds)
        if (lastData && Date.now() - lastData.timestamp < 60000) {
            updateUI(lastData.data);
            return;
        }

        const response = await fetch("/news");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Cache the data with timestamp
        lastData = { data, timestamp: Date.now() };
        updateUI(data);
    } catch (error) {
        console.error("Error fetching news:", error);
        if (errorMessage) {
            errorMessage.innerText = "Failed to load news. Please try again.";
            errorMessage.style.display = "block";
        }
        // Use cached data as fallback if available
        if (lastData) {
            updateUI(lastData.data);
        }
    } finally {
        list.style.opacity = "1";
    }
}

function updateUI(data) {
    const list = document.getElementById("news-list");
    const header = document.getElementById("feed-header");

    // Update header
    header.innerText = `${data.category} → ${data.feed_name}`;

    // Clear existing list
    list.innerHTML = "";

    // Populate news items
    data.items.forEach(item => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `
            <a href="${item.link}" target="_blank" 
               data-bs-toggle="tooltip" 
               data-bs-placement="top" 
               title="${item.preview}">
               ${item.title}
            </a>
        `;
        list.appendChild(li);
    });

    // Initialize tooltips only for new elements
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]:not(.tooltip-initialized)');
    tooltipTriggerList.forEach(el => {
        el.classList.add("tooltip-initialized");
        new bootstrap.Tooltip(el);
    });
}

// Initial load
loadNews();

// Auto-refresh every 10 seconds
setInterval(loadNews, 10000);

// Manual refresh button (if element exists)
const refreshBtn = document.getElementById("refresh-btn");
if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
        lastData = null; // Clear cache on manual refresh
        loadNews();
    });
}