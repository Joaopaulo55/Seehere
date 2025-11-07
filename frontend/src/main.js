import './style.css';

const API_BASE = 'https://seehere-backend.onrender.com';let currentUser = null;
let currentVideo = null;
let player = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadHomePage();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    // Theme toggle
    const themeToggle = document.createElement('button');
    themeToggle.textContent = '🌓';
    themeToggle.className = 'theme-toggle';
    themeToggle.onclick = toggleTheme;
    document.querySelector('.navbar').appendChild(themeToggle);
}

// Auth Functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateAuthUI();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        }
    }
}

function updateAuthUI() {
    const authSection = document.getElementById('authSection');
    const userSection = document.getElementById('userSection');
    const userName = document.getElementById('userName');
    
    if (currentUser) {
        authSection.style.display = 'none';
        userSection.style.display = 'flex';
        userName.textContent = currentUser.displayName;
    } else {
        authSection.style.display = 'flex';
        userSection.style.display = 'none';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModals();
            showNotification('Login realizado com sucesso!', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Erro ao fazer login', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const displayName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, displayName })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModals();
            showNotification('Conta criada com sucesso!', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    } catch (error) {
        showNotification('Erro ao criar conta', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showNotification('Logout realizado', 'info');
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

async function loadHomePage() {
    await loadFeaturedCollections();
    await loadVideos();
    showPage('homePage');
}

async function loadFeaturedCollections() {
    try {
        const response = await fetch(`${API_BASE}/collections?featured=true`);
        const data = await response.json();
        
        const grid = document.getElementById('featuredCollections');
        grid.innerHTML = data.collections.map(collection => `
            <div class="collection-card" onclick="viewCollection('${collection.id}')">
                <img src="${collection.thumbnailUrl || '/placeholder.jpg'}" alt="${collection.name}">
                <h4>${collection.name}</h4>
                <p>${collection.description || ''}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load collections:', error);
    }
}

async function loadVideos(page = 1) {
    try {
        const response = await fetch(`${API_BASE}/videos?page=${page}&limit=12`);
        const data = await response.json();
        
        const grid = document.getElementById('videosGrid');
        if (page === 1) {
            grid.innerHTML = '';
        }
        
        grid.innerHTML += data.videos.map(video => `
            <div class="video-card" onclick="viewVideo('${video.id}')">
                <img src="${video.thumbnailUrl || '/placeholder.jpg'}" alt="${video.title}">
                <div class="video-info">
                    <h4>${video.title}</h4>
                    <p>${video.owner.displayName}</p>
                    <div class="video-stats">
                        <span>👁️ ${video.viewsCount}</span>
                        <span>❤️ ${video._count.likes}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Show/hide load more button
        document.getElementById('loadMore').style.display = 
            page < data.pagination.pages ? 'block' : 'none';
    } catch (error) {
        console.error('Failed to load videos:', error);
    }
}

async function viewVideo(videoId) {
    try {
        const response = await fetch(`${API_BASE}/videos/${videoId}`);
        const data = await response.json();
        
        currentVideo = data.video;
        showVideoPage();
        initializePlayer();
        loadHeatmap();
        loadComments();
    } catch (error) {
        console.error('Failed to load video:', error);
    }
}

function showVideoPage() {
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || '';
    document.getElementById('videoViews').textContent = `${currentVideo.viewsCount} visualizações`;
    document.getElementById('videoDate').textContent = new Date(currentVideo.createdAt).toLocaleDateString();
    document.getElementById('likeCount').textContent = currentVideo.likesCount;
    
    // Tags
    const tagsContainer = document.getElementById('videoTags');
    tagsContainer.innerHTML = currentVideo.tags.map(tag => 
        `<span class="tag">${tag}</span>`
    ).join('');
    
    // Collections
    const collectionsContainer = document.getElementById('videoCollections');
    collectionsContainer.innerHTML = currentVideo.collections.map(cv => 
        `<span class="collection-tag">${cv.collection.name}</span>`
    ).join('');
    
    showPage('videoPage');
}

function initializePlayer() {
    if (player) {
        player.dispose();
    }
    
    player = videojs('videoPlayer', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        sources: [{
            src: currentVideo.urlStream,
            type: 'video/mp4'
        }]
    });
    
    // Track video events
    let sessionId = Math.random().toString(36).substr(2, 9);
    let lastPosition = 0;
    
    player.on('play', () => recordEvent('PLAY', player.currentTime()));
    player.on('pause', () => recordEvent('PAUSE', player.currentTime()));
    player.on('seeked', () => recordEvent('SEEK', player.currentTime()));
    player.on('timeupdate', () => {
        const currentTime = player.currentTime();
        if (Math.abs(currentTime - lastPosition) > 5) {
            recordEvent('TIMEUPDATE', currentTime);
            lastPosition = currentTime;
        }
    });
    player.on('ended', () => recordEvent('ENDED', player.currentTime()));
}

async function recordEvent(eventType, positionSeconds) {
    if (!currentUser) return;
    
    try {
        await fetch(`${API_BASE}/videos/${currentVideo.id}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                eventType,
                positionSeconds,
                sessionId: Math.random().toString(36).substr(2, 9)
            })
        });
    } catch (error) {
        console.error('Failed to record event:', error);
    }
}

async function loadHeatmap() {
    try {
        const response = await fetch(`${API_BASE}/analytics/${currentVideo.id}/heatmap`);
        const data = await response.json();
        
        const heatmap = document.getElementById('heatmap');
        if (data.mostRepeated.length > 0) {
            const segment = data.mostRepeated[0];
            heatmap.innerHTML = `
                <p>Segmento: ${formatTime(segment.start)} - ${formatTime(segment.end)}</p>
                <div class="heatmap-bar">
                    <div class="heatmap-segment" style="width: ${(segment.end - segment.start) / data.duration * 100}%; left: ${segment.start / data.duration * 100}%;"></div>
                </div>
            `;
        } else {
            heatmap.innerHTML = '<p>Dados insuficientes</p>';
        }
    } catch (error) {
        console.error('Failed to load heatmap:', error);
    }
}

async function loadComments() {
    try {
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = currentVideo.comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <strong>${comment.user.displayName}</strong>
                    <span>${new Date(comment.createdAt).toLocaleDateString()}</span>
                </div>
                <p>${comment.body}</p>
                ${comment.replies && comment.replies.length > 0 ? 
                    comment.replies.map(reply => `
                        <div class="comment-reply">
                            <strong>${reply.user.displayName}</strong>
                            <p>${reply.body}</p>
                        </div>
                    `).join('') : ''
                }
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load comments:', error);
    }
}

async function addComment() {
    if (!currentUser) {
        showNotification('Faça login para comentar', 'error');
        return;
    }
    
    const commentText = document.getElementById('commentText').value;
    if (!commentText.trim()) return;
    
    try {
        const response = await fetch(`${API_BASE}/videos/${currentVideo.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ body: commentText })
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            // Reload video to get updated comments
            await viewVideo(currentVideo.id);
            showNotification('Comentário adicionado!', 'success');
        }
    } catch (error) {
        showNotification('Erro ao adicionar comentário', 'error');
    }
}

async function toggleLike() {
    if (!currentUser) {
        showNotification('Faça login para curtir', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/videos/${currentVideo.id}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        document.getElementById('likeCount').textContent = 
            parseInt(document.getElementById('likeCount').textContent) + (data.liked ? 1 : -1);
    } catch (error) {
        showNotification('Erro ao curtir', 'error');
    }
}

function downloadVideo() {
    if (currentVideo.urlDownload) {
        window.open(currentVideo.urlDownload, '_blank');
    }
}

function shareVideo() {
    if (navigator.share) {
        navigator.share({
            title: currentVideo.title,
            text: currentVideo.description,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copiado!', 'success');
    }
}

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Modal functions
function showLogin() { document.getElementById('loginModal').style.display = 'block'; }
function showSignup() { document.getElementById('signupModal').style.display = 'block'; }
function closeModals() { 
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    }); 
}

// Global functions for HTML onclick
window.showLogin = showLogin;
window.showSignup = showSignup;
window.closeModals = closeModals;
window.logout = logout;
window.viewVideo = viewVideo;
window.toggleLike = toggleLike;
window.addComment = addComment;
window.downloadVideo = downloadVideo;
window.shareVideo = shareVideo;
window.loadMoreVideos = () => loadVideos(2); // Simple pagination