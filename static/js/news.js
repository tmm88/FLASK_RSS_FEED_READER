async function loadNews() {
    const response = await fetch("/news");
    const data = await response.json();

    document.getElementById("feed-header").innerText = `${data.category} → ${data.feed_name}`;

    const list = document.getElementById("news-list");
    list.innerHTML = "";

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

    // Enable Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(el => new bootstrap.Tooltip(el))
}

loadNews();
setInterval(loadNews, 10000);
