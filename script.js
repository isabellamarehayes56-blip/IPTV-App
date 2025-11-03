document.addEventListener('DOMContentLoaded', () => {
    const channelList = document.getElementById('channel-list');
    const searchBar = document.getElementById('search-bar');
    const videoPlayer = document.getElementById('video-player');
    const nowPlaying = document.getElementById('now-playing');
    let channelsData = [];
    let hls;

    const API_URLS = {
        channels: 'https://iptv-org.github.io/api/channels.json',
        streams: 'https://iptv-org.github.io/api/streams.json'
    };

    function showStatus(message, showLoader = true) {
        let loaderHTML = showLoader ? '<div class="loader"></div>' : '';
        channelList.innerHTML = `
            <div class="status-container">
                ${loaderHTML}
                <p class="status-message">${message}</p>
            </div>
        `;
    }

    async function fetchData() {
        try {
            showStatus("Loading Channels...");

            const [channelsRes, streamsRes] = await Promise.all([
                fetch(API_URLS.channels),
                fetch(API_URLS.streams)
            ]);

            if (!channelsRes.ok || !streamsRes.ok) {
                throw new Error(`Server responded with status: ${channelsRes.status}, ${streamsRes.status}`);
            }

            showStatus("Processing Data...");

            const channels = await channelsRes.json();
            const streams = await streamsRes.json();
            
            const streamsMap = new Map(streams.map(stream => [stream.channel, stream]));

            channelsData = channels
                .map(channel => {
                    const streamData = streamsMap.get(channel.id);
                    return {
                        ...channel,
                        stream_url: streamData ? streamData.url : null
                    };
                })
                .filter(channel => 
                    channel.stream_url && 
                    channel.logo &&
                    !channel.is_nsfw &&
                    channel.status !== "BROKEN"
                );

            if (channelsData.length === 0) {
                showStatus("No suitable channels found. Please try again later.", false);
            } else {
                displayChannels(channelsData);
                searchBar.disabled = false; // Enable search bar
            }

        } catch (error) {
            console.error("Error details:", error);
            showStatus("Failed to load channels. Check your internet connection and refresh.", false);
        }
    }

    function displayChannels(channels) {
        channelList.innerHTML = ''; 
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `
                <img src="${channel.logo}" alt="${channel.name}" class="channel-logo" loading="lazy" onerror="this.parentElement.style.display='none'">
                <p class="channel-name">${channel.name}</p>
            `;
            card.addEventListener('click', () => {
                playStream(channel.stream_url, channel.name);
                window.scrollTo(0, 0); // Scroll to top
            });
            channelList.appendChild(card);
        });
    }

    function playStream(url, name) {
        nowPlaying.classList.remove('placeholder-text');
        nowPlaying.innerHTML = `<h2>Now Playing: ${name}</h2>`;
        document.title = `Playing: ${name}`;

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
    
    searchBar.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredChannels = channelsData.filter(channel => 
            channel.name.toLowerCase().includes(searchTerm)
        );
        displayChannels(filteredChannels);
    });

    fetchData();
});
