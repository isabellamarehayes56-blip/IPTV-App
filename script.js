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

    async function fetchData() {
        try {
            const [channelsRes, streamsRes] = await Promise.all([
                fetch(API_URLS.channels),
                fetch(API_URLS.streams)
            ]);

            const channels = await channelsRes.json();
            const streams = await streamsRes.json();
            
            const streamsMap = new Map(streams.map(stream => [stream.channel, stream]));

            channelsData = channels.map(channel => {
                const streamData = streamsMap.get(channel.id);
                return {
                    ...channel,
                    stream_url: streamData ? streamData.url : null
                };
            }).filter(channel => channel.stream_url && channel.logo); 

            displayChannels(channelsData);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            channelList.innerHTML = '<p style="color: var(--text-color); text-align: center;">Could not load channels. Please try again later.</p>';
        }
    }

    function displayChannels(channels) {
        channelList.innerHTML = ''; 
        if (channels.length === 0) {
            channelList.innerHTML = '<p>No channels found.</p>';
            return;
        }
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `
                <img src="${channel.logo}" alt="${channel.name} logo" class="channel-logo" loading="lazy" onerror="this.parentElement.style.display='none'">
                <p class="channel-name">${channel.name}</p>
            `;
            card.addEventListener('click', () => {
                playStream(channel.stream_url, channel.name, channel.logo);
            });
            channelList.appendChild(card);
        });
    }

    function playStream(url, name, logo) {
        nowPlaying.innerHTML = `
            <h2>Now Playing: ${name}</h2>
        `;
        document.title = `Playing: ${name}`;

        if (Hls.isSupported()) {
            if (hls) {
                hls.destroy();
            }
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoPlayer.play();
            });
             hls.on(Hls.Events.ERROR, function (event, data) {
                console.error('HLS.js error:', data);
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = url;
            videoPlayer.addEventListener('loadedmetadata', () => {
                videoPlayer.play();
            });
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