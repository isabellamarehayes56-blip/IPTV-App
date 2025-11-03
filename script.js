document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const channelList = document.getElementById('channel-list');
    const searchBar = document.getElementById('search-bar');
    const videoPlayer = document.getElementById('video-player');
    const nowPlaying = document.getElementById('now-playing');
    
    // Global variables
    let channelsData = [];
    let hls;

    // API URLs
    const API_URLS = {
        channels: 'https://iptv-org.github.io/api/channels.json',
        streams: 'https://iptv-org.github.io/api/streams.json'
    };

    // Function to show loading/error status
    function showStatus(message, showLoader = true) {
        let loaderHTML = showLoader ? '<div class="loader"></div>' : '';
        channelList.innerHTML = `
            <div class="status-container">
                ${loaderHTML}
                <p class="status-message">${message}</p>
            </div>
        `;
    }

    // Main function to fetch and process data
    async function fetchData() {
        try {
            showStatus("Loading channels list...");

            // Fetch both files at the same time for speed
            const [channelsRes, streamsRes] = await Promise.all([
                fetch(API_URLS.channels),
                fetch(API_URLS.streams)
            ]);

            // Check if fetches were successful
            if (!channelsRes.ok || !streamsRes.ok) {
                throw new Error(`API request failed. Status: ${channelsRes.status}, ${streamsRes.status}`);
            }

            showStatus("Processing thousands of channels...");

            const channels = await channelsRes.json();
            const streams = await streamsRes.json();
            
            // Create a Map for quick lookup of streams by channel ID
            const streamsMap = new Map(streams.map(stream => [stream.channel, stream]));

            // Combine and filter the data
            channelsData = channels
                .map(channel => {
                    const streamData = streamsMap.get(channel.id);
                    return { ...channel, stream_url: streamData ? streamData.url : null };
                })
                .filter(channel => 
                    channel.stream_url && 
                    channel.logo &&
                    !channel.is_nsfw && // Exclude adult channels
                    channel.status !== "BROKEN" // Exclude known broken channels
                );

            // Check if we have any channels left after filtering
            if (channelsData.length === 0) {
                showStatus("Could not find any working channels at the moment. Please try again later.", false);
            } else {
                displayChannels(channelsData);
                searchBar.placeholder = `Search in ${channelsData.length} channels...`;
                searchBar.disabled = false; // Enable search bar now
            }

        } catch (error) {
            console.error("A critical error occurred:", error);
            showStatus("Failed to load channels. Check your internet connection and try refreshing.", false);
        }
    }

    // Function to display channels on the screen
    function displayChannels(channels) {
        channelList.innerHTML = ''; 
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.setAttribute('data-channel-name', channel.name); // For searching
            card.innerHTML = `
                <img src="${channel.logo}" alt="${channel.name}" class="channel-logo" loading="lazy" onerror="this.parentElement.style.display='none'">
                <p class="channel-name">${channel.name}</p>
            `;
            // Add click event to play the channel
            card.addEventListener('click', () => {
                playStream(channel.stream_url, channel.name);
                if (window.innerWidth < 992) {
                    videoPlayer.scrollIntoView({ behavior: 'smooth' });
                }
            });
            channelList.appendChild(card);
        });
    }

    // Function to play a video stream
    function playStream(url, name) {
        nowPlaying.classList.remove('placeholder-text');
        nowPlaying.innerHTML = `<h2>Now Playing: ${name}</h2>`;
        document.title = `▶ ${name}`;

        // Using HLS.js for streaming
        if (Hls.isSupported()) {
            if (hls) hls.destroy();
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => videoPlayer.play());
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.play();
        }
    }
    
    // Event listener for the search bar
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const allCards = channelList.querySelectorAll('.channel-card');
        allCards.forEach(card => {
            const channelName = card.dataset.channelName.toLowerCase();
            if (channelName.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });

    // Start the app
    fetchData();
});
