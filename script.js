// Danh sách bài hát với tên file và tên hiển thị
const availableSongs = [
    { file: 'baotienmotmobinhyen.mp3', title: 'Bao Tiền Một Mớ Bình Yên' },
    { file: 'ChuyenCuaMuaDong.mp3', title: 'Chuyện Của Mùa Đông' },
    { file: 'thapdrilltudo.mp3', title: 'Tháp Drill Tự Do' },
    { file: 'yeu5.mp3', title: 'Yêu 5' }
];

let isPlaying = false;

// Audio Context and Analyzer setup
let audioContext;
let analyser;
let source;
let dataArray;
let bufferLength;
let visualizerCanvas;
let canvasCtx;
let isVisualizerInitialized = false;
let currentBuffer = null;
let audioElement;
let animationId = null;
let sleepTimerId = null;
let sleepTimerEnd = null;
let currentPlaylistName = null; // Tên playlist hiện tại đang phát

let isSeeking = false;
let wasPlaying = false;
const progressContainer = document.querySelector('.progress');
const audio = document.getElementById('audioPlayer');
const progressBar = document.getElementById('progressBar');
const currentTimeSpan = document.getElementById('currentTime');
const durationSpan = document.getElementById('duration');

/**
 * Định dạng số giây thành chuỗi mm:ss
 * @param {number} seconds - Tổng số giây
 * @returns {string} Chuỗi thời gian dạng mm:ss
 */
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Cập nhật thanh tiến trình và thời gian phát nhạc
 * Đồng bộ giá trị progress bar, current time, duration
 */
function updateProgressBarAndTime() {
    if (!audio.duration) {
        currentTimeSpan.textContent = '0:00';
        durationSpan.textContent = '0:00';
        progressBar.value = 0;
        progressBar.style.setProperty('--progress-percent', '0%');
        return;
    }
    if (!progressBar.dragging) {
        progressBar.value = (audio.currentTime / audio.duration) * 100 || 0;
    }
    currentTimeSpan.textContent = formatTime(audio.currentTime);
    durationSpan.textContent = formatTime(audio.duration);
    progressBar.style.setProperty('--progress-percent', progressBar.value + '%');
}

if (progressBar && audio) {
    audio.addEventListener('timeupdate', updateProgressBarAndTime);
    audio.addEventListener('loadedmetadata', updateProgressBarAndTime);
    progressBar.addEventListener('input', () => {
        progressBar.dragging = true;
        const percent = progressBar.value / 100;
        audio.currentTime = percent * audio.duration;
        updateProgressBarAndTime();
    });
    progressBar.addEventListener('change', () => {
        progressBar.dragging = false;
        updateProgressBarAndTime();
    });
}

/**
 * Hiển thị danh sách bài hát có sẵn lên UI
 * Tạo các nút play và add-to-playlist cho từng bài
 */
function displayAvailableSongs() {
    const songList = document.getElementById('songList');
    if (!songList) {
        console.error('Song list element not found');
        return;
    }
    songList.innerHTML = '';
    availableSongs.forEach(song => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        // Lấy tên hiển thị
        const songTitle = song.title;
        // Create song info div
        const songInfo = document.createElement('div');
        songInfo.className = 'd-flex align-items-center gap-2';
        songInfo.innerHTML = `
            <i class="fas fa-music text-primary"></i>
            <span>${songTitle}</span>
        `;
        // Create action buttons
        const actions = document.createElement('div');
        actions.className = 'd-flex gap-2';
        const playButton = document.createElement('button');
        playButton.className = 'btn btn-sm btn-outline-primary';
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.onclick = () => loadAndPlaySong(song.file);
        const addToPlaylistButton = document.createElement('button');
        addToPlaylistButton.className = 'btn btn-sm btn-outline-secondary';
        addToPlaylistButton.innerHTML = '<i class="fas fa-plus"></i>';
        addToPlaylistButton.onclick = () => addToCurrentPlaylist(song.file);
        actions.appendChild(playButton);
        actions.appendChild(addToPlaylistButton);
        li.appendChild(songInfo);
        li.appendChild(actions);
        songList.appendChild(li);
    });
}

/**
 * Bật/tắt phát nhạc (play/pause)
 * Nếu chưa có audioContext thì khởi tạo visualizer
 * Cập nhật icon play/pause
 */
async function togglePlay() {
    const audio = document.getElementById('audioPlayer');
    const playButton = document.querySelector('.controls button:nth-child(3)');
    
    try {
        if (!audio.src) {
            console.log('No audio source selected');
            return;
        }
        
        if (!audioContext) {
            initializeVisualizer();
        }
        
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (isPlaying) {
            audio.pause();
            updatePlayButtonIcon(false);
        } else {
            audio.play();
            updatePlayButtonIcon(true);
        }
        isPlaying = !isPlaying;
    } catch (error) {
        console.error('Error in togglePlay:', error);
    }
}

/**
 * Phát bài trước trong playlist hiện tại
 * Nếu chỉ có 1 bài thì không làm gì
 */
function previousTrack() {
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (!currentPlaylist) return;
    const songs = Array.from(currentPlaylist.getElementsByTagName('li'));
    if (songs.length <= 1) return; // Không làm gì nếu chỉ có 1 bài
    const nowPlaying = document.getElementById('nowPlayingTitle').textContent;
    const currentLi = songs.find(li => li.querySelector('span').textContent === nowPlaying);
    const currentIndex = songs.indexOf(currentLi);
    if (currentIndex > 0) {
        const prevLi = songs[currentIndex - 1];
        loadAndPlaySong(prevLi.dataset.file);
    }
}

/**
 * Phát bài tiếp theo trong playlist hiện tại
 * Nếu chỉ có 1 bài thì không làm gì
 */
function nextTrack() {
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (!currentPlaylist) return;
    const songs = Array.from(currentPlaylist.getElementsByTagName('li'));
    if (songs.length <= 1) return; 
    const nowPlaying = document.getElementById('nowPlayingTitle').textContent;
    const currentLi = songs.find(li => li.querySelector('span').textContent === nowPlaying);
    const currentIndex = songs.indexOf(currentLi);
    if (currentIndex < songs.length - 1 && currentIndex !== -1) {
        const nextLi = songs[currentIndex + 1];
        loadAndPlaySong(nextLi.dataset.file);
    } 
}

/**
 * Xóa toàn bộ bài hát khỏi playlist hiện tại trên UI
 */
function clearCurrentPlaylist() {
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (currentPlaylist) {
        currentPlaylist.innerHTML = '';
    }
    // Reset tên playlist hiện tại
    currentPlaylistName = null;
    updateCurrentPlaylistNameDisplay();
}

/**
 * Cập nhật hiển thị tên playlist hiện tại
 */
function updateCurrentPlaylistNameDisplay() {
    const playlistNameElement = document.getElementById('currentPlaylistName');
    if (playlistNameElement) {
        if (currentPlaylistName) {
            playlistNameElement.textContent = `(${currentPlaylistName})`;
            playlistNameElement.style.display = 'inline';
        } else {
            playlistNameElement.style.display = 'none';
        }
    }
}

/**
 * Load và phát một bài hát theo file
 * Cập nhật trạng thái, icon, now playing, notification
 * Xử lý sự kiện khi bài hát kết thúc
 * @param {string} songFile - Tên file bài hát
 */
function loadAndPlaySong(songFile) {
    const audio = document.getElementById('audioPlayer');
    const playButton = document.querySelector('.controls button:nth-child(3)');
    try {
        audio.src = `music/${songFile}`;
        if (!audioContext) {
            initializeVisualizer();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        audio.play().then(() => {
            isPlaying = true;
            updatePlayButtonIcon(true);
            updateNowPlaying(songFile);
            const song = availableSongs.find(s => s.file === songFile);
            showSongNotification(song ? song.title : songFile);
        }).catch(error => {
            console.error('Error playing audio:', error);
        });
        audio.addEventListener('timeupdate', updateProgressBarAndTime);
        audio.addEventListener('ended', () => {
            // Kiểm tra nếu đang ở bài cuối cùng trong playlist thì đổi icon về play
            const currentPlaylist = document.getElementById('currentPlaylist');
            if (currentPlaylist) {
                const songs = Array.from(currentPlaylist.getElementsByTagName('li'));
                const nowPlaying = document.getElementById('nowPlayingTitle').textContent;
                const currentLi = songs.find(li => li.querySelector('span').textContent === nowPlaying);
                const currentIndex = songs.indexOf(currentLi);
                if (currentIndex === songs.length - 1 || songs.length === 1) {
                    isPlaying = false;
                    updatePlayButtonIcon(false);
                } else {
                    nextTrack();
                }
            } else {
                isPlaying = false;
                updatePlayButtonIcon(false);
            }
        });
    } catch (error) {
        console.error('Error in loadAndPlaySong:', error);
    }
}

/**
 * Cập nhật tiêu đề "Now Playing" và highlight bài đang phát trong playlist
 * @param {string} songFile - Tên file bài hát
 */
function updateNowPlaying(songFile) {
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    const song = availableSongs.find(s => s.file === songFile);
    if (nowPlayingTitle && song) {
        nowPlayingTitle.textContent = song.title;
    }
    // Highlight bài đang phát trong current playlist
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (currentPlaylist) {
        const items = currentPlaylist.querySelectorAll('li');
        items.forEach(li => {
            const span = li.querySelector('span');
            if (span && li.dataset.file === songFile) {
                li.classList.add('playing');
            } else {
                li.classList.remove('playing');
            }
        });
    }
}

/**
 * Thêm một bài hát vào playlist hiện tại trên UI (thủ công)
 * Reset tên playlist vì đây không phải từ playlist có sẵn
 * @param {string} songFile - Tên file bài hát
 */
function addToCurrentPlaylist(songFile) {
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (!currentPlaylist) {
        console.error('Current playlist element not found');
        return;
    }
    const song = availableSongs.find(s => s.file === songFile);
    if (!song) return;
    
    // Reset tên playlist vì đây là thêm thủ công
    currentPlaylistName = null;
    updateCurrentPlaylistNameDisplay();
    
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.style.cursor = 'pointer';
    li.dataset.file = song.file;
    const songInfo = document.createElement('div');
    songInfo.className = 'd-flex align-items-center gap-2';
    songInfo.innerHTML = `
        <i class="fas fa-music text-primary"></i>
        <span>${song.title}</span>
    `;
    const removeButton = document.createElement('button');
    removeButton.className = 'btn btn-sm btn-outline-danger';
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.onclick = (e) => { e.stopPropagation(); li.remove(); };
    li.appendChild(songInfo);
    li.appendChild(removeButton);
    li.onclick = function(e) {
        if (e.target.closest('button')) return;
        loadAndPlaySong(song.file);
    };
    currentPlaylist.appendChild(li);
}

/**
 * Thêm một bài hát vào playlist hiện tại từ playlist có sẵn
 * Không reset tên playlist vì đây là từ playlist
 * @param {string} songFile - Tên file bài hát
 */
function addToCurrentPlaylistFromPlaylist(songFile) {
    const currentPlaylist = document.getElementById('currentPlaylist');
    if (!currentPlaylist) {
        console.error('Current playlist element not found');
        return;
    }
    const song = availableSongs.find(s => s.file === songFile);
    if (!song) return;
    
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.style.cursor = 'pointer';
    li.dataset.file = song.file;
    const songInfo = document.createElement('div');
    songInfo.className = 'd-flex align-items-center gap-2';
    songInfo.innerHTML = `
        <i class="fas fa-music text-primary"></i>
        <span>${song.title}</span>
    `;
    const removeButton = document.createElement('button');
    removeButton.className = 'btn btn-sm btn-outline-danger';
    removeButton.innerHTML = '<i class="fas fa-times"></i>';
    removeButton.onclick = (e) => { e.stopPropagation(); li.remove(); };
    li.appendChild(songInfo);
    li.appendChild(removeButton);
    li.onclick = function(e) {
        if (e.target.closest('button')) return;
        loadAndPlaySong(song.file);
    };
    currentPlaylist.appendChild(li);
}

/**
 * Hiển thị tất cả playlist đã lưu ra UI
 * Gồm các nút play, edit, delete cho từng playlist
 */
function renderPlaylists() {
    const playlistContainer = document.getElementById('playlistContainer');
    playlistContainer.innerHTML = '';
    const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    Object.entries(playlists).forEach(([name, files]) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'list-group-item playlist-item';
        // Main playlist info
        const playlistInfo = document.createElement('div');
        playlistInfo.className = 'd-flex align-items-center gap-2';
        playlistInfo.innerHTML = `
            <i class="fas fa-list"></i>
            <span>${name}</span>
            <small class="text-muted">(${files.length} songs)</small>
        `;
        // Playlist actions
        const actions = document.createElement('div');
        actions.className = 'playlist-actions';
        const playButton = document.createElement('button');
        playButton.className = 'btn btn-sm btn-outline-primary';
        playButton.innerHTML = '<i class="fas fa-play"></i>';
        playButton.onclick = () => playPlaylist(name);
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-sm btn-outline-secondary';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.onclick = () => editPlaylist(name);
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-sm btn-outline-danger';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.onclick = () => deletePlaylist(name);
        actions.appendChild(playButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        playlistItem.appendChild(playlistInfo);
        playlistItem.appendChild(actions);
        playlistContainer.appendChild(playlistItem);
    });
}

/**
 * Hiển thị danh sách bài hát để chọn khi tạo playlist mới
 */
function populateSongSelection() {
    const songSelection = document.getElementById('songSelection');
    songSelection.innerHTML = '';
    availableSongs.forEach(song => {
        const div = document.createElement('div');
        div.className = 'list-group-item d-flex justify-content-between align-items-center';
        const label = document.createElement('label');
        label.className = 'form-check-label';
        label.textContent = song.title;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-check-input ms-2';
        // Lưu file vào thuộc tính data-file để lấy lại khi tạo playlist
        checkbox.dataset.file = song.file;
        div.appendChild(label);
        div.appendChild(checkbox);
        songSelection.appendChild(div);
    });
}

/**
 * Tạo playlist mới từ các bài đã chọn
 * Lưu vào localStorage
 */
function createPlaylist() {
    const playlistName = document.getElementById('playlistName').value.trim();
    if (!playlistName) {
        alert('Please enter a playlist name.');
        return;
    }
    const selectedSongs = Array.from(document.getElementById('songSelection').getElementsByTagName('input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.dataset.file);
    if (selectedSongs.length === 0) {
        alert('Please select at least one song for the playlist.');
        return;
    }
    const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    if (playlists[playlistName]) {
        alert('A playlist with this name already exists. Please choose a different name.');
        return;
    }
    playlists[playlistName] = selectedSongs;
    localStorage.setItem('playlists', JSON.stringify(playlists));
    document.getElementById('playlistName').value = '';
    Array.from(document.getElementById('songSelection').getElementsByTagName('input'))
        .forEach(checkbox => checkbox.checked = false);
    $('#createPlaylistModal').modal('hide');
    renderPlaylists();
}

/**
 * Hiển thị modal chỉnh sửa playlist, đánh dấu các bài đã có trong playlist
 * @param {string} playlistName - Tên playlist
 */
function editPlaylist(playlistName) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    const playlist = playlists[playlistName];
    if (playlist) {
        document.getElementById('editPlaylistName').value = playlistName;
        
        // Populate edit song selection
        const editSongSelection = document.getElementById('editSongSelection');
        editSongSelection.innerHTML = '';
        
        availableSongs.forEach(song => {
            const div = document.createElement('div');
            div.className = 'list-group-item d-flex justify-content-between align-items-center';

            const label = document.createElement('label');
            label.className = 'form-check-label';
            label.textContent = song.title;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-check-input ms-2';
            checkbox.checked = playlist.includes(song.file);

            div.appendChild(label);
            div.appendChild(checkbox);
            editSongSelection.appendChild(div);
        });
        
        $('#editPlaylistModal').modal('show');
    }
}

/**
 * Lưu lại các thay đổi khi chỉnh sửa playlist
 * Cập nhật localStorage và UI
 */
function saveEditedPlaylist() {
    const playlistName = document.getElementById('editPlaylistName').value;
    const selectedSongs = Array.from(document.getElementById('editSongSelection').getElementsByTagName('input'))
        .filter(checkbox => checkbox.checked)
        .map(checkbox => {
            // Tìm song object theo title để lấy file name
            const title = checkbox.previousElementSibling.textContent;
            const song = availableSongs.find(s => s.title === title);
            return song ? song.file : null;
        })
        .filter(file => file !== null);
    if (selectedSongs.length === 0) {
        alert('Please select at least one song for the playlist.');
        return;
    }
    const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    playlists[playlistName] = selectedSongs;
    localStorage.setItem('playlists', JSON.stringify(playlists));
    $('#editPlaylistModal').modal('hide');
    renderPlaylists();
}

/**
 * Xóa một playlist khỏi localStorage và UI
 * @param {string} playlistName - Tên playlist
 */
function deletePlaylist(playlistName) {
    if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
        const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
        delete playlists[playlistName];
        localStorage.setItem('playlists', JSON.stringify(playlists));
        renderPlaylists();
    }
}

/**
 * Phát toàn bộ playlist: clear playlist hiện tại, thêm các bài, phát bài đầu tiên
 * @param {string} playlistName - Tên playlist
 */
function playPlaylist(playlistName) {
    const playlists = JSON.parse(localStorage.getItem('playlists')) || {};
    const playlist = playlists[playlistName];
    if (playlist && playlist.length > 0) {
        // Clear current playlist
        clearCurrentPlaylist();
        
        // Set tên playlist hiện tại
        currentPlaylistName = playlistName;
        updateCurrentPlaylistNameDisplay();
        
        // Add all songs to current playlist
        playlist.forEach(song => addToCurrentPlaylistFromPlaylist(song));
        
        // Play first song
        loadAndPlaySong(playlist[0]);
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    displayAvailableSongs();
    renderPlaylists();
    
    // Add event listener for create playlist modal
    $('#createPlaylistModal').on('show.bs.modal', populateSongSelection);
    
    // Initialize audio player controls
    const audio = document.getElementById('audioPlayer');
    const volumeControl = document.getElementById('volumeControl');
    const playbackSpeed = document.getElementById('playbackSpeed');
    
    // Set up volume control
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            audio.volume = e.target.value;
        });
    }
    
    // Set up playback speed control
    if (playbackSpeed) {
        playbackSpeed.addEventListener('change', (e) => {
            audio.playbackRate = parseFloat(e.target.value);
        });
    }
    
    // Handle canvas resize with debounce
    let resizeTimeout;
    function resizeCanvas() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Re-initialize visualizer to handle resize properly
            if (audioContext) {
                initializeVisualizer();
            }
        }, 100);
    }
    
    // Handle canvas resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Initialize visualizer
    initializeVisualizer();

    // Dark mode toggle
    const darkModeBtn = document.getElementById('toggleDarkMode');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark ? '1' : '0');
            darkModeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
        // On load, set dark mode if saved
        const savedDark = localStorage.getItem('darkMode');
        if (savedDark === '1') {
            document.body.classList.add('dark-mode');
            darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            darkModeBtn.innerHTML = '<i class="fas fa-moon"></i>';
        }
    }

    const sleepTimerBtn = document.getElementById('sleepTimerBtn');
    if (sleepTimerBtn) {
        sleepTimerBtn.addEventListener('click', () => {
            $('#sleepTimerModal').modal('show');
            if (sleepTimerEnd && sleepTimerEnd > Date.now()) {
                showSleepTimerStatus(`Sẽ tắt nhạc sau ${Math.ceil((sleepTimerEnd-Date.now())/60000)} phút (${formatSleepTimerCountdown()})`);
                updateSleepTimerCountdown();
            } else {
                showSleepTimerStatus('Không có hẹn giờ');
            }
        });
    }

    // Khi load trang, nếu có ?song=... thì tự động phát bài đó
    const params = new URLSearchParams(window.location.search);
    const song = params.get('song');
    if (song) {
        // Tìm theo file
        const found = availableSongs.find(s => s.file === song);
        if (found) {
            // Cập nhật tên bài hát trước, sau đó thử phát
            updateNowPlaying(found.file);
            // Thử phát với xử lý lỗi autoplay
            loadAndPlaySongWithAutoplayHandling(found.file);
        }
    }
});

/**
 * Khởi tạo visualizer (canvas) cho audio
 * Thiết lập audio context, analyser, vẽ sóng nhạc động
 * Tự động scale canvas theo device pixel ratio
 */
function initializeVisualizer() {
    if (isVisualizerInitialized) {
        // Just update canvas size if already initialized
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        return;
    }
    
    const audio = document.getElementById('audioPlayer');
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size with device pixel ratio for crisp rendering
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    function updateCanvasSize() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        // Reset scale and set new scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        return rect;
    }
    
    // Initial size setup
    let rect = updateCanvasSize();
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        source = audioContext.createMediaElementSource(audio);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    
    function draw() {
        // Cancel previous animation if exists
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
        
        animationId = requestAnimationFrame(draw);
        
        // Update canvas size if needed
        const currentRect = container.getBoundingClientRect();
        if (currentRect.width !== rect.width || currentRect.height !== rect.height) {
            rect = updateCanvasSize();
        }
        
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (rect.width / dataArray.length);
        let barHeight;
        let x = 0;
        ctx.clearRect(0, 0, rect.width, rect.height);
        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] / 255 * rect.height;
            x = i * barWidth;
            // Tính hue cho mỗi cột, chạy từ 0 đến 240 (đỏ đến xanh dương)
            const hue = (i / dataArray.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 85%, 55%)`;
            ctx.fillRect(x, rect.height - barHeight, barWidth - 1, barHeight);
        }
    }
    
    draw();
    isVisualizerInitialized = true;
}

/**
 * Tua lùi 10 giây
 */
function seekBackward() {
    const audio = document.getElementById('audioPlayer');
    if (audio) {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    }
}

/**
 * Tua tiến 10 giây
 */
function seekForward() {
    const audio = document.getElementById('audioPlayer');
    if (audio) {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
    }
}

/**
 * Xác nhận và thiết lập hẹn giờ tắt nhạc
 * Lấy số phút từ input
 */
function confirmSleepTimer() {
    const input = document.getElementById('sleepTimerInput');
    let minutes = parseInt(input.value, 10);
    if (isNaN(minutes) || minutes < 1) minutes = 1;
    setSleepTimer(minutes);
}

/**
 * Thiết lập hẹn giờ tắt nhạc, cập nhật UI
 * @param {number} minutes - Số phút hẹn giờ
 */
function setSleepTimer(minutes) {
    cancelSleepTimer();
    const audio = document.getElementById('audioPlayer');
    if (!audio) return;
    sleepTimerEnd = Date.now() + minutes * 60 * 1000;
    sleepTimerId = setTimeout(() => {
        audio.pause();
        isPlaying = false;
        updatePlayButtonIcon(false);
        showSleepTimerStatus('Đã tắt nhạc (hết giờ)');
    }, minutes * 60 * 1000);
    showSleepTimerStatus(`Sẽ tắt nhạc sau ${formatSleepTimerCountdown()}`);
    updateSleepTimerCountdown();
}

/**
 * Cập nhật icon play/pause trên nút điều khiển
 * @param {boolean} isPlaying - Trạng thái đang phát hay không
 */
function updatePlayButtonIcon(isPlaying) {
    const playButton = document.querySelector('.controls button:nth-child(3)');
    if (playButton) {
        playButton.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
    }
}

/**
 * Hiển thị trạng thái hẹn giờ tắt nhạc lên UI
 * @param {string} msg - Thông báo
 */
function showSleepTimerStatus(msg) {
    const status = document.getElementById('sleepTimerStatus');
    if (status) status.textContent = msg;
}

/**
 * Định dạng thời gian còn lại của sleep timer thành mm:ss
 * @returns {string}
 */
function formatSleepTimerCountdown() {
    if (!sleepTimerEnd) return '';
    let ms = sleepTimerEnd - Date.now();
    if (ms <= 0) return '0:00';
    // Làm tròn lên để hiển thị đúng giây đầu tiên
    ms = Math.ceil(ms / 1000) * 1000;
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Cập nhật liên tục trạng thái đếm ngược sleep timer trên UI
 */
function updateSleepTimerCountdown() {
    if (!sleepTimerEnd) return;
    const status = document.getElementById('sleepTimerStatus');
    if (!status) return;
    const ms = sleepTimerEnd - Date.now();
    if (ms > 0) {
        status.textContent = `Sẽ tắt nhạc sau ${formatSleepTimerCountdown()}`;
        setTimeout(updateSleepTimerCountdown, 1000);
    } else {
        status.textContent = 'Đã tắt nhạc (hết giờ)';
    }
}

/**
 * Hủy hẹn giờ tắt nhạc, cập nhật UI
 */
function cancelSleepTimer() {
    if (sleepTimerId) {
        clearTimeout(sleepTimerId);
        sleepTimerId = null;
        sleepTimerEnd = null;
    }
    showSleepTimerStatus('Không có hẹn giờ');
}

/**
 * Tạo link chia sẻ bài hát đang phát, copy vào clipboard
 * Hiển thị thông báo đã copy
 */
function shareCurrentSong() {
    const nowPlayingTitle = document.getElementById('nowPlayingTitle');
    if (!nowPlayingTitle) return;
    const songTitle = nowPlayingTitle.textContent;
    if (!songTitle || songTitle === 'No song playing') {
        return;
    }
    // Tìm object bài hát theo title
    const song = availableSongs.find(s => s.title === songTitle);
    if (!song) return;
    // Tạo URL với query ?song=<file>
    const url = new URL(window.location.href);
    url.searchParams.set('song', song.file);
    navigator.clipboard.writeText(url.toString()).then(() => {
        const msg = document.getElementById('shareCopiedMsg');
        if (msg) {
            msg.style.display = 'inline';
            setTimeout(() => { msg.style.display = 'none'; }, 1500);
        }
    });
}

/**
 * Hiển thị notification "Đang phát nhạc" trên desktop (nếu được cấp quyền)
 * @param {string} songName - Tên bài hát
 */
function showSongNotification(songName) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification('Đang phát nhạc', { body: songName });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Đang phát nhạc', { body: songName });
            }
        });
    }
}

/**
 * Load và phát một bài hát theo file với xử lý autoplay restrictions
 * Đảm bảo tên bài hát luôn hiển thị đúng ngay cả khi autoplay bị chặn
 * @param {string} songFile - Tên file bài hát
 */
function loadAndPlaySongWithAutoplayHandling(songFile) {
    const audio = document.getElementById('audioPlayer');
    const playButton = document.querySelector('.controls button:nth-child(3)');
    
    try {
        audio.src = `music/${songFile}`;
        
        // Cập nhật tên bài hát ngay lập tức
        updateNowPlaying(songFile);
        
        if (!audioContext) {
            initializeVisualizer();
        }
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Thử phát với xử lý lỗi autoplay
        audio.play().then(() => {
            isPlaying = true;
            updatePlayButtonIcon(true);
            const song = availableSongs.find(s => s.file === songFile);
            showSongNotification(song ? song.title : songFile);
        }).catch(error => {
            console.log('Autoplay blocked or error:', error);
            // Autoplay bị chặn, nhưng tên bài hát đã được cập nhật
            isPlaying = false;
            updatePlayButtonIcon(false);
            // Không hiển thị lỗi cho user vì đây là hành vi bình thường của trình duyệt
        });
        
        audio.addEventListener('timeupdate', updateProgressBarAndTime);
        audio.addEventListener('ended', () => {
            // Kiểm tra nếu đang ở bài cuối cùng trong playlist thì đổi icon về play
            const currentPlaylist = document.getElementById('currentPlaylist');
            if (currentPlaylist) {
                const songs = Array.from(currentPlaylist.getElementsByTagName('li'));
                const nowPlaying = document.getElementById('nowPlayingTitle').textContent;
                const currentLi = songs.find(li => li.querySelector('span').textContent === nowPlaying);
                const currentIndex = songs.indexOf(currentLi);
                if (currentIndex === songs.length - 1 || songs.length === 1) {
                    isPlaying = false;
                    updatePlayButtonIcon(false);
                } else {
                    nextTrack();
                }
            } else {
                isPlaying = false;
                updatePlayButtonIcon(false);
            }
        });
    } catch (error) {
        console.error('Error in loadAndPlaySongWithAutoplayHandling:', error);
    }
}