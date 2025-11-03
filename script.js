document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const channelGrid = document.getElementById('channel-grid'),
        searchBar = document.getElementById('search-bar'),
        searchIcon = document.getElementById('search-icon'),
        statusContainer = document.getElementById('status-container'),
        statusMessage = document.getElementById('status-message'),
        modal = document.getElementById('player-modal'),
        videoPlayer = document.getElementById('video-player'),
        closeModal = document.getElementById('close-modal'),
        playerStatus = document.getElementById('player-status'),
        countrySelector = document.getElementById('country-selector'),
        categorySelector = document.getElementById('category-selector');

    // App State
    let hls, allCountryChannels = [], currentCategories = new Set();
    const COUNTRIES = [
        { code: 'pk', name: 'Pakistan' },
        { code: 'in', name: 'India' },
        { code: 'us', name: 'USA' },
        { code: 'gb', name: 'UK' },
        { code: 'all', name: 'All Channels' }
    ];

    // Functions
    function showStatus(message) { statusContainer.style.display = 'flex'; statusMessage.textContent = message; channelGrid.innerHTML = ''; }
    function hideStatus() { statusContainer.style.display = 'none'; }

    async function loadCountryPlaylist(countryCode) {
        showStatus(`Loading channels for ${COUNTRIES.find(c => c.code === countryCode).name}...`);
        const M3U_URL = countryCode === 'all' ? 'https://iptv-org.github.io/iptv/index.m3u' : `https://iptv-org.github.io/iptv/countries/${countryCode}.m3u`;
        try {
            const response = await fetch(M3U_URL);
            if (!response.ok) throw new Error('Network issue');
            const data = await response.text();
            parseM3U(data);
        } catch (error) { showStatus('Failed to load playlist. Please check your connection and try another country.'); }
    }

    function parseM3U(data) {
        allCountryChannels = [];
        currentCategories.clear();
        const lines = data.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('#EXTINF:')) {
                const infoLine = lines[i], urlLine = lines[i + 1];
                const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/), nameMatch = infoLine.match(/,(.+)/), groupMatch = infoLine.match(/group-title="([^"]+)"/);
                if (logoMatch && nameMatch && urlLine) {
                    const category = groupMatch ? groupMatch[1] : 'Other';
                    currentCategories.add(category);
                    allCountryChannels.push({ logo: logoMatch[1], name: nameMatch[1].trim(), url: urlLine.trim(), category });
                }
            }
        }
        populateCategories();
        filterAndDisplayChannels();
        hideStatus();
    }

    function populateCountries() {
        COUNTRIES.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            countrySelector.appendChild(option);
        });
    }

    function populateCategories() {
        categorySelector.innerHTML = '<option value="all">All Categories</option>';
        Array.from(currentCategories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelector.appendChild(option);
        });
    }

    function filterAndDisplayChannels() {
        const category = categorySelector.value;
        const searchTerm = searchBar.value.toLowerCase();
        let filtered = allCountryChannels;
        if (category !== 'all') filtered = filtered.filter(c => c.category === category);
        if (searchTerm) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm));
        displayChannels(filtered);
    }

    function displayChannels(channels) {
        channelGrid.innerHTML = '';
        if (channels.length === 0) {
            channelGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center;">No channels found for this selection.</p>';
            return;
        }
        channels.forEach(channel => {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `<img src="${channel.logo}" alt="${channel.name}" class="channel-logo" loading="lazy" onerror="this.parentElement.style.display='none'"><p class="channel-name">${channel.name}</p>`;
            card.addEventListener('click', () => playChannel(channel));
            channelGrid.appendChild(card);
        });
    }

    function playChannel(channel) {
        videoPlayer.style.display = 'none';
        playerStatus.style.display = 'block';
        playerStatus.textContent = `Loading: ${channel.name}...`;
        modal.style.display = 'flex';
        if (Hls.isSupported()) {
            if (hls) hls.destroy();
            hls = new Hls();
            hls.loadSource(channel.url);
            hls.attachMedia(videoPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { videoPlayer.style.display = 'block'; playerStatus.style.display = 'none'; videoPlayer.play(); });
            hls.on(Hls.Events.ERROR, () => { playerStatus.textContent = 'This channel is unavailable.'; });
        }
    }

    function stopPlayer() {
        modal.style.display = 'none';
        videoPlayer.pause();
        if (hls) hls.destroy();
    }

    // Event Listeners
    countrySelector.addEventListener('change', () => loadCountryPlaylist(countrySelector.value));
    categorySelector.addEventListener('change', filterAndDisplayChannels);
    searchBar.addEventListener('input', filterAndDisplayChannels);
    searchIcon.addEventListener('click', () => searchBar.classList.toggle('active'));
    closeModal.addEventListener('click', stopPlayer);

    // Initializer
    function init() {
        populateCountries();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
    }

    init();
});
