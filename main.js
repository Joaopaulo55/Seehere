// Configurações
const API_BASE = 'https://seehere-backend.onrender.com';
let currentUser = null;
let currentVideo = null;
let player = null;
let currentVideoPage = 1;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Seehere Frontend Inicializado');
    checkAuth();
    loadHomePage();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    // Search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });
    
    // Theme toggle
    const themeToggle = document.createElement('button');
    themeToggle.textContent = '🌓';
    themeToggle.className = 'theme-toggle';
    themeToggle.onclick = toggleTheme;
    document.querySelector('.nav-auth').prepend(themeToggle);
}

// Auth Functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateAuthUI();
                showNotification('Login automático realizado!', 'success');
            } else {
                localStorage.removeItem('token');
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
        userName.textContent = currentUser.displayName || currentUser.email;
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
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModals();
            showNotification('Login realizado com sucesso!', 'success');
            loadHomePage();
        } else {
            showNotification(data.error || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Erro de conexão com o servidor', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const displayName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
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
            showNotification(data.error || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Erro de conexão com o servidor', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showNotification('Logout realizado', 'info');
    loadHomePage();
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

async function loadHomePage() {
    showPage('homePage');
    await loadFeaturedCollections();
    await loadVideos();
}

// ✅ CORRIGIDO: Agora pega coleções do backend corretamente
async function loadFeaturedCollections() {
    try {
        const grid = document.getElementById('featuredCollections');
        grid.innerHTML = '<div class="loading">Carregando coleções...</div>';
        
        const response = await fetch(`${API_BASE}/api/collections?featured=true`);
        
        if (!response.ok) {
            throw new Error('Failed to load collections');
        }
        
        const data = await response.json();
        
        if (data.collections && data.collections.length > 0) {
            grid.innerHTML = data.collections.map(collection => `
                <div class="collection-card" onclick="viewCollection('${collection.id}')">
                    <img src="${collection.thumbnailUrl || 'https://via.placeholder.com/300x200/007bff/ffffff?text=Seehere'}" 
                         alt="${collection.name}" 
                         onerror="this.src='https://via.placeholder.com/300x200/007bff/ffffff?text=Seehere'">
                    <h4>${collection.name}</h4>
                    <p>${collection.description || 'Coleção de vídeos'}</p>
                    <div class="collection-stats">
                        <span>${collection._count?.videos || 0} vídeos</span>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="no-data">Nenhuma coleção em destaque</div>';
        }
    } catch (error) {
        console.error('Failed to load collections:', error);
        document.getElementById('featuredCollections').innerHTML = 
            '<div class="error">Erro ao carregar coleções</div>';
    }
}

// ✅ CORRIGIDO: Agora pega vídeos do backend corretamente
async function loadVideos(page = 1) {
    try {
        const grid = document.getElementById('videosGrid');
        if (page === 1) {
            grid.innerHTML = '<div class="loading">Carregando vídeos...</div>';
        }
        
        const response = await fetch(`${API_BASE}/api/videos?page=${page}&limit=12`);
        
        if (!response.ok) {
            throw new Error('Failed to load videos');
        }
        
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            const videosHTML = data.videos.map(video => `
                <div class="video-card" onclick="viewVideo('${video.id}')">
                    <img src="${video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                         alt="${video.title}"
                         onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                    <div class="video-info">
                        <h4>${video.title}</h4>
                        <p>${video.owner?.displayName || 'Usuário'}</p>
                        <div class="video-stats">
                            <span>👁️ ${video.viewsCount || 0}</span>
                            <span>❤️ ${video.likesCount || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            if (page === 1) {
                grid.innerHTML = videosHTML;
            } else {
                grid.innerHTML += videosHTML;
            }
            
            // Show/hide load more button
            const loadMoreBtn = document.getElementById('loadMore');
            if (data.pagination && page < data.pagination.pages) {
                loadMoreBtn.style.display = 'block';
                currentVideoPage = page;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            grid.innerHTML = '<div class="no-data">Nenhum vídeo encontrado</div>';
            document.getElementById('loadMore').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load videos:', error);
        document.getElementById('videosGrid').innerHTML = 
            '<div class="error">Erro ao carregar vídeos</div>';
    }
}

// ✅ CORRIGIDO: Função para visualizar coleção
async function viewCollection(collectionId) {
    try {
        showNotification('Carregando coleção...', 'info');
        
        const response = await fetch(`${API_BASE}/api/collections/${collectionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load collection');
        }
        
        const data = await response.json();
        const collection = data.collection;
        
        // Criar uma página temporária para mostrar os vídeos da coleção
        showCollectionPage(collection);
        
    } catch (error) {
        console.error('Failed to load collection:', error);
        showNotification('Erro ao carregar coleção', 'error');
    }
}

function showCollectionPage(collection) {
    // Criar HTML temporário para a coleção
    const tempHTML = `
        <div class="collection-page">
            <button onclick="loadHomePage()" class="back-button">← Voltar</button>
            <div class="collection-header">
                <h1>${collection.name}</h1>
                <p>${collection.description || ''}</p>
                <div class="collection-meta">
                    <span>${collection._count?.videos || 0} vídeos</span>
                    <span>Criado por: ${collection.createdBy?.displayName || 'Sistema'}</span>
                </div>
            </div>
            <div class="collection-videos-grid" id="collectionVideosGrid">
                ${collection.videos && collection.videos.length > 0 ? 
                    collection.videos.map(cv => `
                        <div class="video-card" onclick="viewVideo('${cv.video.id}')">
                            <img src="${cv.video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                                 alt="${cv.video.title}"
                                 onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                            <div class="video-info">
                                <h4>${cv.video.title}</h4>
                                <p>${cv.video.owner?.displayName || 'Usuário'}</p>
                                <div class="video-stats">
                                    <span>👁️ ${cv.video.viewsCount || 0}</span>
                                    <span>❤️ ${cv.video.likesCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-data">Nenhum vídeo nesta coleção</div>'
                }
            </div>
        </div>
    `;
    
    document.getElementById('homePage').innerHTML = tempHTML;
    showPage('homePage');
}

async function viewVideo(videoId) {
    try {
        showNotification('Carregando vídeo...', 'info');
        
        const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load video');
        }
        
        const data = await response.json();
        currentVideo = data.video;
        
        if (!currentVideo) {
            throw new Error('Video data not found');
        }
        
        showVideoPage();
        initializePlayer();
        loadHeatmap();
        loadComments();
        
    } catch (error) {
        console.error('Failed to load video:', error);
        showNotification('Erro ao carregar vídeo', 'error');
        loadHomePage();
    }
}

function showVideoPage() {
    if (!currentVideo) return;
    
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || 'Sem descrição';
    document.getElementById('videoViews').textContent = `${currentVideo.viewsCount || 0} visualizações`;
    document.getElementById('videoDate').textContent = new Date(currentVideo.createdAt).toLocaleDateString('pt-BR');
    document.getElementById('likeCount').textContent = currentVideo.likesCount || 0;
    
    // Tags
    const tagsContainer = document.getElementById('videoTags');
    if (currentVideo.tags && currentVideo.tags.length > 0) {
        tagsContainer.innerHTML = currentVideo.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="tag">sem tags</span>';
    }
    
    // Collections
    const collectionsContainer = document.getElementById('videoCollections');
    if (currentVideo.collections && currentVideo.collections.length > 0) {
        collectionsContainer.innerHTML = currentVideo.collections.map(cv => 
            `<span class="collection-tag" onclick="viewCollection('${cv.collection.id}')">${cv.collection.name}</span>`
        ).join('');
    } else {
        collectionsContainer.innerHTML = '<span class="collection-tag">Nenhuma coleção</span>';
    }
    
    showPage('videoPage');
}

function initializePlayer() {
    if (!currentVideo) return;
    
    if (player) {
        player.dispose();
    }
    
    player = videojs('videoPlayer', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        sources: [{
            src: currentVideo.urlStream || currentVideo.urlDownload,
            type: 'video/mp4'
        }]
    });
    
    // Track video events for analytics
    player.on('play', () => {
        recordEvent('PLAY', player.currentTime());
    });
    
    player.on('ended', () => {
        recordEvent('ENDED', player.currentTime());
    });
}

async function recordEvent(eventType, positionSeconds) {
    if (!currentUser || !currentVideo) return;
    
    try {
        await fetch(`${API_BASE}/api/videos/${currentVideo.id}/events`, {
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
        const heatmap = document.getElementById('heatmap');
        
        const response = await fetch(`${API_BASE}/api/analytics/${currentVideo.id}/heatmap`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.mostRepeated && data.mostRepeated.length > 0) {
                const segment = data.mostRepeated[0];
                heatmap.innerHTML = `
                    <p>Segmento mais assistido: ${formatTime(segment.start)} - ${formatTime(segment.end)}</p>
                    <div class="heatmap-bar">
                        <div class="heatmap-segment" style="width: ${(segment.end - segment.start) / (data.duration || 100) * 100}%; left: ${segment.start / (data.duration || 100) * 100}%;"></div>
                    </div>
                `;
            } else {
                heatmap.innerHTML = '<p>Dados de heatmap indisponíveis</p>';
            }
        } else {
            heatmap.innerHTML = '<p>Erro ao carregar heatmap</p>';
        }
    } catch (error) {
        console.error('Failed to load heatmap:', error);
        document.getElementById('heatmap').innerHTML = '<p>Erro ao carregar dados</p>';
    }
}

async function loadComments() {
    try {
        const commentsList = document.getElementById('commentsList');
        
        if (currentVideo.comments && currentVideo.comments.length > 0) {
            commentsList.innerHTML = currentVideo.comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.user?.displayName || 'Usuário'}</strong>
                        <span>${new Date(comment.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p>${comment.body}</p>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<div class="no-data">Nenhum comentário ainda</div>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        document.getElementById('commentsList').innerHTML = '<div class="error">Erro ao carregar comentários</div>';
    }
}

async function addComment() {
    if (!currentUser) {
        showNotification('Faça login para comentar', 'error');
        showLogin();
        return;
    }
    
    const commentText = document.getElementById('commentText').value.trim();
    if (!commentText) {
        showNotification('Digite um comentário', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/videos/${currentVideo.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ body: commentText })
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            showNotification('Comentário adicionado!', 'success');
            // Reload comments
            await viewVideo(currentVideo.id);
        } else {
            showNotification('Erro ao adicionar comentário', 'error');
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function toggleLike() {
    if (!currentUser) {
        showNotification('Faça login para curtir', 'error');
        showLogin();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/videos/${currentVideo.id}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const likeCount = document.getElementById('likeCount');
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = data.liked ? currentCount + 1 : currentCount - 1;
            showNotification(data.liked ? 'Você curtiu o vídeo!' : 'Like removido', 'success');
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        showNotification('Erro ao curtir', 'error');
    }
}

function downloadVideo() {
    if (currentVideo && currentVideo.urlDownload) {
        window.open(currentVideo.urlDownload, '_blank');
    } else {
        showNotification('Link de download não disponível', 'warning');
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
        showNotification('Link copiado para a área de transferência!', 'success');
    }
}

// ✅ MELHORADO: Busca funcional
async function searchVideos() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        showNotification(`Buscando por: ${searchTerm}`, 'info');
        
        try {
            const response = await fetch(`${API_BASE}/api/videos?search=${encodeURIComponent(searchTerm)}`);
            
            if (response.ok) {
                const data = await response.json();
                updateSearchResults(data.videos || []);
            } else {
                throw new Error('Falha na busca');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Erro na busca', 'error');
        }
    } else {
        // Se busca vazia, recarrega vídeos normais
        loadVideos();
    }
}

function updateSearchResults(videos) {
    const grid = document.getElementById('videosGrid');
    const loadMoreBtn = document.getElementById('loadMore');
    
    if (videos.length > 0) {
        grid.innerHTML = videos.map(video => `
            <div class="video-card" onclick="viewVideo('${video.id}')">
                <img src="${video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                     alt="${video.title}"
                     onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                <div class="video-info">
                    <h4>${video.title}</h4>
                    <p>${video.owner?.displayName || 'Usuário'}</p>
                    <div class="video-stats">
                        <span>👁️ ${video.viewsCount || 0}</span>
                        <span>❤️ ${video.likesCount || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        grid.innerHTML = '<div class="no-data">Nenhum vídeo encontrado</div>';
    }
    
    loadMoreBtn.style.display = 'none';
}

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showNotification(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
}

// Modal functions
function showLogin() { 
    document.getElementById('loginModal').style.display = 'block'; 
}

function showSignup() { 
    document.getElementById('signupModal').style.display = 'block'; 
}

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
window.searchVideos = searchVideos;
window.loadMoreVideos = () => loadVideos(currentVideoPage + 1);
window.viewCollection = viewCollection;

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModals();
        }
    });
});

// Add CSS for animations and new styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading, .no-data, .error {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
        font-style: italic;
    }
    
    .error {
        color: #dc3545;
    }
    
    .collection-stats {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: var(--text-muted);
    }
    
    .back-button {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 1rem;
    }
    
    .collection-header {
        margin-bottom: 2rem;
        text-align: center;
    }
    
    .collection-meta {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1rem;
        color: var(--text-muted);
    }
    
    .collection-tag {
        cursor: pointer;
        transition: opacity 0.2s;
    }
    
    .collection-tag:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'system';
document.documentElement.setAttribute('data-theme', savedTheme);// Configurações
const API_BASE = 'https://seehere-backend.onrender.com';
let currentUser = null;
let currentVideo = null;
let player = null;
let currentVideoPage = 1;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Seehere Frontend Inicializado');
    checkAuth();
    loadHomePage();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    // Search
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchVideos();
    });
    
    // Theme toggle
    const themeToggle = document.createElement('button');
    themeToggle.textContent = '🌓';
    themeToggle.className = 'theme-toggle';
    themeToggle.onclick = toggleTheme;
    document.querySelector('.nav-auth').prepend(themeToggle);
}

// Auth Functions
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                updateAuthUI();
                showNotification('Login automático realizado!', 'success');
            } else {
                localStorage.removeItem('token');
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
        userName.textContent = currentUser.displayName || currentUser.email;
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
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateAuthUI();
            closeModals();
            showNotification('Login realizado com sucesso!', 'success');
            loadHomePage();
        } else {
            showNotification(data.error || 'Erro ao fazer login', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Erro de conexão com o servidor', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const displayName = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        const response = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
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
            showNotification(data.error || 'Erro ao criar conta', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Erro de conexão com o servidor', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    updateAuthUI();
    showNotification('Logout realizado', 'info');
    loadHomePage();
}

// Page Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    // Scroll to top
    window.scrollTo(0, 0);
}

async function loadHomePage() {
    showPage('homePage');
    await loadFeaturedCollections();
    await loadVideos();
}

// ✅ CORRIGIDO: Agora pega coleções do backend corretamente
async function loadFeaturedCollections() {
    try {
        const grid = document.getElementById('featuredCollections');
        grid.innerHTML = '<div class="loading">Carregando coleções...</div>';
        
        const response = await fetch(`${API_BASE}/api/collections?featured=true`);
        
        if (!response.ok) {
            throw new Error('Failed to load collections');
        }
        
        const data = await response.json();
        
        if (data.collections && data.collections.length > 0) {
            grid.innerHTML = data.collections.map(collection => `
                <div class="collection-card" onclick="viewCollection('${collection.id}')">
                    <img src="${collection.thumbnailUrl || 'https://via.placeholder.com/300x200/007bff/ffffff?text=Seehere'}" 
                         alt="${collection.name}" 
                         onerror="this.src='https://via.placeholder.com/300x200/007bff/ffffff?text=Seehere'">
                    <h4>${collection.name}</h4>
                    <p>${collection.description || 'Coleção de vídeos'}</p>
                    <div class="collection-stats">
                        <span>${collection._count?.videos || 0} vídeos</span>
                    </div>
                </div>
            `).join('');
        } else {
            grid.innerHTML = '<div class="no-data">Nenhuma coleção em destaque</div>';
        }
    } catch (error) {
        console.error('Failed to load collections:', error);
        document.getElementById('featuredCollections').innerHTML = 
            '<div class="error">Erro ao carregar coleções</div>';
    }
}

// ✅ CORRIGIDO: Agora pega vídeos do backend corretamente
async function loadVideos(page = 1) {
    try {
        const grid = document.getElementById('videosGrid');
        if (page === 1) {
            grid.innerHTML = '<div class="loading">Carregando vídeos...</div>';
        }
        
        const response = await fetch(`${API_BASE}/api/videos?page=${page}&limit=12`);
        
        if (!response.ok) {
            throw new Error('Failed to load videos');
        }
        
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
            const videosHTML = data.videos.map(video => `
                <div class="video-card" onclick="viewVideo('${video.id}')">
                    <img src="${video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                         alt="${video.title}"
                         onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                    <div class="video-info">
                        <h4>${video.title}</h4>
                        <p>${video.owner?.displayName || 'Usuário'}</p>
                        <div class="video-stats">
                            <span>👁️ ${video.viewsCount || 0}</span>
                            <span>❤️ ${video.likesCount || 0}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            if (page === 1) {
                grid.innerHTML = videosHTML;
            } else {
                grid.innerHTML += videosHTML;
            }
            
            // Show/hide load more button
            const loadMoreBtn = document.getElementById('loadMore');
            if (data.pagination && page < data.pagination.pages) {
                loadMoreBtn.style.display = 'block';
                currentVideoPage = page;
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            grid.innerHTML = '<div class="no-data">Nenhum vídeo encontrado</div>';
            document.getElementById('loadMore').style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to load videos:', error);
        document.getElementById('videosGrid').innerHTML = 
            '<div class="error">Erro ao carregar vídeos</div>';
    }
}

// ✅ CORRIGIDO: Função para visualizar coleção
async function viewCollection(collectionId) {
    try {
        showNotification('Carregando coleção...', 'info');
        
        const response = await fetch(`${API_BASE}/api/collections/${collectionId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load collection');
        }
        
        const data = await response.json();
        const collection = data.collection;
        
        // Criar uma página temporária para mostrar os vídeos da coleção
        showCollectionPage(collection);
        
    } catch (error) {
        console.error('Failed to load collection:', error);
        showNotification('Erro ao carregar coleção', 'error');
    }
}

function showCollectionPage(collection) {
    // Criar HTML temporário para a coleção
    const tempHTML = `
        <div class="collection-page">
            <button onclick="loadHomePage()" class="back-button">← Voltar</button>
            <div class="collection-header">
                <h1>${collection.name}</h1>
                <p>${collection.description || ''}</p>
                <div class="collection-meta">
                    <span>${collection._count?.videos || 0} vídeos</span>
                    <span>Criado por: ${collection.createdBy?.displayName || 'Sistema'}</span>
                </div>
            </div>
            <div class="collection-videos-grid" id="collectionVideosGrid">
                ${collection.videos && collection.videos.length > 0 ? 
                    collection.videos.map(cv => `
                        <div class="video-card" onclick="viewVideo('${cv.video.id}')">
                            <img src="${cv.video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                                 alt="${cv.video.title}"
                                 onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                            <div class="video-info">
                                <h4>${cv.video.title}</h4>
                                <p>${cv.video.owner?.displayName || 'Usuário'}</p>
                                <div class="video-stats">
                                    <span>👁️ ${cv.video.viewsCount || 0}</span>
                                    <span>❤️ ${cv.video.likesCount || 0}</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : 
                    '<div class="no-data">Nenhum vídeo nesta coleção</div>'
                }
            </div>
        </div>
    `;
    
    document.getElementById('homePage').innerHTML = tempHTML;
    showPage('homePage');
}

async function viewVideo(videoId) {
    try {
        showNotification('Carregando vídeo...', 'info');
        
        const response = await fetch(`${API_BASE}/api/videos/${videoId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load video');
        }
        
        const data = await response.json();
        currentVideo = data.video;
        
        if (!currentVideo) {
            throw new Error('Video data not found');
        }
        
        showVideoPage();
        initializePlayer();
        loadHeatmap();
        loadComments();
        
    } catch (error) {
        console.error('Failed to load video:', error);
        showNotification('Erro ao carregar vídeo', 'error');
        loadHomePage();
    }
}

function showVideoPage() {
    if (!currentVideo) return;
    
    document.getElementById('videoTitle').textContent = currentVideo.title;
    document.getElementById('videoDescription').textContent = currentVideo.description || 'Sem descrição';
    document.getElementById('videoViews').textContent = `${currentVideo.viewsCount || 0} visualizações`;
    document.getElementById('videoDate').textContent = new Date(currentVideo.createdAt).toLocaleDateString('pt-BR');
    document.getElementById('likeCount').textContent = currentVideo.likesCount || 0;
    
    // Tags
    const tagsContainer = document.getElementById('videoTags');
    if (currentVideo.tags && currentVideo.tags.length > 0) {
        tagsContainer.innerHTML = currentVideo.tags.map(tag => 
            `<span class="tag">${tag}</span>`
        ).join('');
    } else {
        tagsContainer.innerHTML = '<span class="tag">sem tags</span>';
    }
    
    // Collections
    const collectionsContainer = document.getElementById('videoCollections');
    if (currentVideo.collections && currentVideo.collections.length > 0) {
        collectionsContainer.innerHTML = currentVideo.collections.map(cv => 
            `<span class="collection-tag" onclick="viewCollection('${cv.collection.id}')">${cv.collection.name}</span>`
        ).join('');
    } else {
        collectionsContainer.innerHTML = '<span class="collection-tag">Nenhuma coleção</span>';
    }
    
    showPage('videoPage');
}

function initializePlayer() {
    if (!currentVideo) return;
    
    if (player) {
        player.dispose();
    }
    
    player = videojs('videoPlayer', {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: true,
        sources: [{
            src: currentVideo.urlStream || currentVideo.urlDownload,
            type: 'video/mp4'
        }]
    });
    
    // Track video events for analytics
    player.on('play', () => {
        recordEvent('PLAY', player.currentTime());
    });
    
    player.on('ended', () => {
        recordEvent('ENDED', player.currentTime());
    });
}

async function recordEvent(eventType, positionSeconds) {
    if (!currentUser || !currentVideo) return;
    
    try {
        await fetch(`${API_BASE}/api/videos/${currentVideo.id}/events`, {
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
        const heatmap = document.getElementById('heatmap');
        
        const response = await fetch(`${API_BASE}/api/analytics/${currentVideo.id}/heatmap`);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.mostRepeated && data.mostRepeated.length > 0) {
                const segment = data.mostRepeated[0];
                heatmap.innerHTML = `
                    <p>Segmento mais assistido: ${formatTime(segment.start)} - ${formatTime(segment.end)}</p>
                    <div class="heatmap-bar">
                        <div class="heatmap-segment" style="width: ${(segment.end - segment.start) / (data.duration || 100) * 100}%; left: ${segment.start / (data.duration || 100) * 100}%;"></div>
                    </div>
                `;
            } else {
                heatmap.innerHTML = '<p>Dados de heatmap indisponíveis</p>';
            }
        } else {
            heatmap.innerHTML = '<p>Erro ao carregar heatmap</p>';
        }
    } catch (error) {
        console.error('Failed to load heatmap:', error);
        document.getElementById('heatmap').innerHTML = '<p>Erro ao carregar dados</p>';
    }
}

async function loadComments() {
    try {
        const commentsList = document.getElementById('commentsList');
        
        if (currentVideo.comments && currentVideo.comments.length > 0) {
            commentsList.innerHTML = currentVideo.comments.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.user?.displayName || 'Usuário'}</strong>
                        <span>${new Date(comment.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <p>${comment.body}</p>
                </div>
            `).join('');
        } else {
            commentsList.innerHTML = '<div class="no-data">Nenhum comentário ainda</div>';
        }
    } catch (error) {
        console.error('Failed to load comments:', error);
        document.getElementById('commentsList').innerHTML = '<div class="error">Erro ao carregar comentários</div>';
    }
}

async function addComment() {
    if (!currentUser) {
        showNotification('Faça login para comentar', 'error');
        showLogin();
        return;
    }
    
    const commentText = document.getElementById('commentText').value.trim();
    if (!commentText) {
        showNotification('Digite um comentário', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/videos/${currentVideo.id}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ body: commentText })
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            showNotification('Comentário adicionado!', 'success');
            // Reload comments
            await viewVideo(currentVideo.id);
        } else {
            showNotification('Erro ao adicionar comentário', 'error');
        }
    } catch (error) {
        console.error('Failed to add comment:', error);
        showNotification('Erro de conexão', 'error');
    }
}

async function toggleLike() {
    if (!currentUser) {
        showNotification('Faça login para curtir', 'error');
        showLogin();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/videos/${currentVideo.id}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            const likeCount = document.getElementById('likeCount');
            const currentCount = parseInt(likeCount.textContent);
            likeCount.textContent = data.liked ? currentCount + 1 : currentCount - 1;
            showNotification(data.liked ? 'Você curtiu o vídeo!' : 'Like removido', 'success');
        }
    } catch (error) {
        console.error('Failed to toggle like:', error);
        showNotification('Erro ao curtir', 'error');
    }
}

function downloadVideo() {
    if (currentVideo && currentVideo.urlDownload) {
        window.open(currentVideo.urlDownload, '_blank');
    } else {
        showNotification('Link de download não disponível', 'warning');
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
        showNotification('Link copiado para a área de transferência!', 'success');
    }
}

// ✅ MELHORADO: Busca funcional
async function searchVideos() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        showNotification(`Buscando por: ${searchTerm}`, 'info');
        
        try {
            const response = await fetch(`${API_BASE}/api/videos?search=${encodeURIComponent(searchTerm)}`);
            
            if (response.ok) {
                const data = await response.json();
                updateSearchResults(data.videos || []);
            } else {
                throw new Error('Falha na busca');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Erro na busca', 'error');
        }
    } else {
        // Se busca vazia, recarrega vídeos normais
        loadVideos();
    }
}

function updateSearchResults(videos) {
    const grid = document.getElementById('videosGrid');
    const loadMoreBtn = document.getElementById('loadMore');
    
    if (videos.length > 0) {
        grid.innerHTML = videos.map(video => `
            <div class="video-card" onclick="viewVideo('${video.id}')">
                <img src="${video.thumbnailUrl || 'https://via.placeholder.com/280x160/007bff/ffffff?text=Video'}" 
                     alt="${video.title}"
                     onerror="this.src='https://via.placeholder.com/280x160/007bff/ffffff?text=Video'">
                <div class="video-info">
                    <h4>${video.title}</h4>
                    <p>${video.owner?.displayName || 'Usuário'}</p>
                    <div class="video-stats">
                        <span>👁️ ${video.viewsCount || 0}</span>
                        <span>❤️ ${video.likesCount || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        grid.innerHTML = '<div class="no-data">Nenhum vídeo encontrado</div>';
    }
    
    loadMoreBtn.style.display = 'none';
}

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
    `;
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showNotification(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'info');
}

// Modal functions
function showLogin() { 
    document.getElementById('loginModal').style.display = 'block'; 
}

function showSignup() { 
    document.getElementById('signupModal').style.display = 'block'; 
}

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
window.searchVideos = searchVideos;
window.loadMoreVideos = () => loadVideos(currentVideoPage + 1);
window.viewCollection = viewCollection;

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModals();
        }
    });
});

// Add CSS for animations and new styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading, .no-data, .error {
        text-align: center;
        padding: 2rem;
        color: var(--text-muted);
        font-style: italic;
    }
    
    .error {
        color: #dc3545;
    }
    
    .collection-stats {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: var(--text-muted);
    }
    
    .back-button {
        background: var(--primary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        margin-bottom: 1rem;
    }
    
    .collection-header {
        margin-bottom: 2rem;
        text-align: center;
    }
    
    .collection-meta {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 1rem;
        color: var(--text-muted);
    }
    
    .collection-tag {
        cursor: pointer;
        transition: opacity 0.2s;
    }
    
    .collection-tag:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'system';
document.documentElement.setAttribute('data-theme', savedTheme);