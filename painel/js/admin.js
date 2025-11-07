// Configurações
const API_BASE = 'https://seehere-backend.onrender.com';let currentUser = null;
let currentPage = 1;
let totalPages = 1;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
    loadDashboardData();
    setupEventListeners();
});

// Funções de Inicialização
function initializeAdmin() {
    checkAuth();
    setupNavigation();
    loadTheme();
}

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '../painel/admin-login.html';
        return;
    }
    
    // Verificar token com API
    verifyToken(token);
}

async function verifyToken(token) {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Token inválido');
        }
        
        const data = await response.json();
        currentUser = data.user;
        updateUserInfo();
    } catch (error) {
        console.error('Erro na verificação:', error);
        logout();
    }
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.displayName;
    }
}

function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    
    // Notification panel
    document.getElementById('notificationBtn').addEventListener('click', toggleNotifications);
    
    // Pagination
    document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPage').addEventListener('click', () => changePage(1));
    
    // Search
    document.getElementById('videoSearch').addEventListener('input', debounce(searchVideos, 300));
    
    // Filter
    document.getElementById('videoFilter').addEventListener('change', filterVideos);
    
    // Forms
    document.getElementById('addVideoForm').addEventListener('submit', handleAddVideo);
    document.getElementById('addCollectionForm').addEventListener('submit', handleAddCollection);
    
    // Close modals on outside click
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Navegação
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showPage(target);
            
            // Update active state
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show target page
    document.getElementById(pageId).classList.add('active');
    
    // Update page title
    document.getElementById('pageTitle').textContent = 
        document.querySelector(`[href="#${pageId}"] span`).textContent;
    
    // Load page data
    switch(pageId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'videos':
            loadVideos();
            break;
        case 'collections':
            loadCollections();
            break;
        case 'users':
            loadUsers();
            break;
        case 'comments':
            loadComments();
            break;
        case 'analytics':
            loadAnalytics();
            break;
        case 'mega':
            loadMegaFiles();
            break;
    }
}

// Dashboard
async function loadDashboardData() {
    showLoading();
    
    try {
        const [statsResponse, videosResponse, activityResponse] = await Promise.all([
            fetch(`${API_BASE}/admin/dashboard`, {
                headers: getAuthHeaders()
            }),
            fetch(`${API_BASE}/videos?limit=5`),
            fetch(`${API_BASE}/admin/activity`, {
                headers: getAuthHeaders()
            })
        ]);
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            updateDashboardStats(statsData.stats);
        }
        
        if (videosResponse.ok) {
            const videosData = await videosResponse.json();
            updateRecentVideos(videosData.videos);
        }
        
        if (activityResponse.ok) {
            const activityData = await activityResponse.json();
            updateRecentActivity(activityData.activities);
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dados do dashboard', 'error');
    } finally {
        hideLoading();
    }
}

function updateDashboardStats(stats) {
    document.getElementById('totalVideos').textContent = stats.totalVideos || '0';
    document.getElementById('totalUsers').textContent = stats.totalUsers || '0';
    document.getElementById('totalViews').textContent = stats.totalViews || '0';
    document.getElementById('totalComments').textContent = stats.totalComments || '0';
}

function updateRecentVideos(videos) {
    const container = document.getElementById('recentVideosList');
    if (!videos || videos.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhum vídeo recente</p>';
        return;
    }
    
    container.innerHTML = videos.map(video => `
        <div class="recent-item">
            <h4>${video.title}</h4>
            <p>${video.owner.displayName}</p>
            <div class="video-stats">
                <span>👁️ ${video.viewsCount}</span>
                <span>❤️ ${video.likesCount}</span>
            </div>
        </div>
    `).join('');
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!activities || activities.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhuma atividade recente</p>';
        return;
    }
    
    // Simular atividades (em produção viria da API)
    const sampleActivities = [
        { type: 'video', message: 'Novo vídeo adicionado', time: '2 minutos atrás' },
        { type: 'user', message: 'Novo usuário registrado', time: '5 minutos atrás' },
        { type: 'comment', message: 'Novo comentário postado', time: '10 minutos atrás' }
    ];
    
    container.innerHTML = sampleActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

function getActivityIcon(type) {
    const icons = {
        video: 'video',
        user: 'user',
        comment: 'comment'
    };
    return icons[type] || 'bell';
}

// Gerenciamento de Vídeos
async function loadVideos(page = 1) {
    showLoading();
    
    try {
        const search = document.getElementById('videoSearch').value;
        const filter = document.getElementById('videoFilter').value;
        
        let url = `${API_BASE}/admin/videos?page=${page}&limit=10`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (filter !== 'all') url += `&status=${filter}`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateVideosTable(data.videos);
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
        showNotification('Erro ao carregar vídeos', 'error');
    } finally {
        hideLoading();
    }
}

function updateVideosTable(videos) {
    const tbody = document.getElementById('videosTableBody');
    
    if (!videos || videos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="no-data">Nenhum vídeo encontrado</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = videos.map(video => `
        <tr>
            <td>
                <img src="${video.thumbnailUrl || 'https://via.placeholder.com/80x45'}" 
                     alt="${video.title}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>
                <strong>${video.title}</strong>
                <br><small>${video.owner.displayName}</small>
            </td>
            <td>${video.viewsCount}</td>
            <td>${video.likesCount}</td>
            <td>
                <span class="status-badge ${video.isPublished ? 'published' : 'draft'}">
                    ${video.isPublished ? 'Publicado' : 'Rascunho'}
                </span>
            </td>
            <td>${new Date(video.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editVideo('${video.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteVideo('${video.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="viewVideoAnalytics('${video.id}')">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    currentPage = pagination.page;
    totalPages = pagination.pages;
    
    document.getElementById('pageInfo').textContent = 
        `Página ${pagination.page} de ${pagination.pages}`;
    
    document.getElementById('prevPage').disabled = pagination.page <= 1;
    document.getElementById('nextPage').disabled = pagination.page >= pagination.pages;
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= totalPages) {
        loadVideos(newPage);
    }
}

function searchVideos() {
    loadVideos(1);
}

function filterVideos() {
    loadVideos(1);
}

// Modal Functions
function showAddVideoModal() {
    loadCollectionsForSelect();
    document.getElementById('addVideoModal').style.display = 'block';
}

function showAddCollectionModal() {
    document.getElementById('addCollectionModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form Handlers
async function handleAddVideo(e) {
    e.preventDefault();
    
    const formData = {
        title: document.getElementById('videoTitle').value,
        description: document.getElementById('videoDescription').value,
        urlStream: document.getElementById('videoUrl').value,
        urlDownload: document.getElementById('videoDownloadUrl').value || document.getElementById('videoUrl').value,
        thumbnailUrl: document.getElementById('videoThumbnail').value,
        durationSeconds: parseInt(document.getElementById('videoDuration').value) || 0,
        tags: document.getElementById('videoTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        collections: Array.from(document.getElementById('videoCollections').selectedOptions).map(opt => opt.value)
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Vídeo adicionado com sucesso!', 'success');
            closeModal('addVideoModal');
            document.getElementById('addVideoForm').reset();
            loadVideos(); // Reload videos list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Erro ao adicionar vídeo', 'error');
        }
    } catch (error) {
        console.error('Erro ao adicionar vídeo:', error);
        showNotification('Erro ao adicionar vídeo', 'error');
    }
}

async function handleAddCollection(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('collectionName').value,
        description: document.getElementById('collectionDescription').value,
        thumbnailUrl: document.getElementById('collectionThumbnail').value,
        isFeatured: document.getElementById('collectionFeatured').checked
    };
    
    try {
        const response = await fetch(`${API_BASE}/admin/collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showNotification('Coleção criada com sucesso!', 'success');
            closeModal('addCollectionModal');
            document.getElementById('addCollectionForm').reset();
            loadCollections(); // Reload collections list
        } else {
            const error = await response.json();
            showNotification(error.error || 'Erro ao criar coleção', 'error');
        }
    } catch (error) {
        console.error('Erro ao criar coleção:', error);
        showNotification('Erro ao criar coleção', 'error');
    }
}

// Coleções
async function loadCollections() {
    try {
        const response = await fetch(`${API_BASE}/admin/collections`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateCollectionsGrid(data.collections);
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
        showNotification('Erro ao carregar coleções', 'error');
    }
}

function updateCollectionsGrid(collections) {
    const grid = document.getElementById('collectionsGrid');
    
    if (!collections || collections.length === 0) {
        grid.innerHTML = '<p class="no-data">Nenhuma coleção encontrada</p>';
        return;
    }
    
    grid.innerHTML = collections.map(collection => `
        <div class="collection-card">
            <div class="collection-image">
                ${collection.thumbnailUrl ? 
                    `<img src="${collection.thumbnailUrl}" alt="${collection.name}">` :
                    `<i class="fas fa-folder"></i>`
                }
            </div>
            <div class="collection-content">
                <h3>${collection.name}</h3>
                <p>${collection.description || 'Sem descrição'}</p>
                <div class="collection-stats">
                    <span>${collection._count?.videos || 0} vídeos</span>
                    <span>${collection._count?.favorites || 0} favoritos</span>
                </div>
                <div class="collection-actions" style="margin-top: 1rem;">
                    <button class="btn btn-sm btn-primary" onclick="editCollection('${collection.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteCollection('${collection.id}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function loadCollectionsForSelect() {
    try {
        const response = await fetch(`${API_BASE}/admin/collections`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('videoCollections');
            select.innerHTML = data.collections.map(collection => `
                <option value="${collection.id}">${collection.name}</option>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
    }
}

// Usuários
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUsersTable(data.users);
        }
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showNotification('Erro ao carregar usuários', 'error');
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">Nenhum usuário encontrado</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <img src="${user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=007bff&color=fff'}" 
                         alt="${user.displayName}" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div>
                        <strong>${user.displayName || 'Sem nome'}</strong>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <span class="status-badge active">Ativo</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="banUser('${user.id}')">
                        <i class="fas fa-ban"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Comentários
async function loadComments() {
    try {
        const response = await fetch(`${API_BASE}/admin/comments`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateCommentsList(data.comments);
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        showNotification('Erro ao carregar comentários', 'error');
    }
}

function updateCommentsList(comments) {
    const container = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = '<p class="no-data">Nenhum comentário para moderar</p>';
        return;
    }
    
    // Simular comentários (em produção viria da API)
    const sampleComments = [
        {
            id: '1',
            user: { displayName: 'João Silva', avatarUrl: null },
            video: { title: 'Vídeo Exemplo 1' },
            body: 'Este é um comentário muito interessante!',
            createdAt: new Date().toISOString()
        },
        {
            id: '2', 
            user: { displayName: 'Maria Santos', avatarUrl: null },
            video: { title: 'Vídeo Exemplo 2' },
            body: 'Ótimo conteúdo, parabéns!',
            createdAt: new Date(Date.now() - 3600000).toISOString()
        }
    ];
    
    container.innerHTML = sampleComments.map(comment => `
        <div class="comment-item">
            <div class="comment-header">
                <div class="comment-user">
                    <img src="${comment.user.avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(comment.user.displayName) + '&background=007bff&color=fff'}" 
                         alt="${comment.user.displayName}" style="width: 24px; height: 24px; border-radius: 50%;">
                    ${comment.user.displayName}
                </div>
                <div class="comment-actions">
                    <button class="btn btn-sm btn-success" onclick="approveComment('${comment.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteComment('${comment.id}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="comment-content">
                ${comment.body}
            </div>
            <div class="comment-video">
                No vídeo: <strong>${comment.video.title}</strong>
            </div>
            <div class="comment-time">
                ${new Date(comment.createdAt).toLocaleString()}
            </div>
        </div>
    `).join('');
}

// Analytics
async function loadAnalytics() {
    showLoading();
    
    try {
        // Carregar dados de analytics
        // Em produção, isso viria de endpoints específicos de analytics
        setTimeout(() => {
            hideLoading();
        }, 1000);
    } catch (error) {
        console.error('Erro ao carregar analytics:', error);
        showNotification('Erro ao carregar analytics', 'error');
        hideLoading();
    }
}

// MEGA Integration
async function loadMegaFiles() {
    const container = document.getElementById('megaFilesList');
    container.innerHTML = `
        <div class="no-data">
            <p>Conecte-se ao MEGA para listar os arquivos</p>
        </div>
    `;
}

function connectMega() {
    showNotification('Funcionalidade de conexão MEGA em desenvolvimento', 'info');
}

function testMegaConnection() {
    const email = document.getElementById('megaEmail').value;
    const password = document.getElementById('megaPassword').value;
    
    if (!email || !password) {
        showNotification('Preencha email e senha do MEGA', 'warning');
        return;
    }
    
    showNotification('Testando conexão com MEGA...', 'info');
    // Em produção, isso faria a conexão real com a API do MEGA
}

// Utility Functions
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Authorization': `Bearer ${token}`
    };
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar estilos dinâmicos
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        z-index: 4000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || '#17a2b8';
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('adminTheme', newTheme);
    
    // Update icon
    const icon = document.querySelector('.theme-toggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function loadTheme() {
    const savedTheme = localStorage.getItem('adminTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Update icon
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleNotifications() {
    document.getElementById('notificationsPanel').classList.toggle('open');
}

function closeNotifications() {
    document.getElementById('notificationsPanel').classList.remove('open');
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '../admin-login.html';
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Placeholder functions for actions
function editVideo(videoId) {
    showNotification(`Editando vídeo ${videoId}`, 'info');
}

function deleteVideo(videoId) {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
        showNotification(`Vídeo ${videoId} excluído`, 'success');
        loadVideos(); // Reload list
    }
}

function viewVideoAnalytics(videoId) {
    showNotification(`Abrindo analytics do vídeo ${videoId}`, 'info');
}

function editCollection(collectionId) {
    showNotification(`Editando coleção ${collectionId}`, 'info');
}

function deleteCollection(collectionId) {
    if (confirm('Tem certeza que deseja excluir esta coleção?')) {
        showNotification(`Coleção ${collectionId} excluída`, 'success');
        loadCollections(); // Reload list
    }
}

function editUser(userId) {
    showNotification(`Editando usuário ${userId}`, 'info');
}

function banUser(userId) {
    if (confirm('Tem certeza que deseja banir este usuário?')) {
        showNotification(`Usuário ${userId} banido`, 'success');
        loadUsers(); // Reload list
    }
}

function approveComment(commentId) {
    showNotification(`Comentário ${commentId} aprovado`, 'success');
    // Reload comments
    loadComments();
}

function deleteComment(commentId) {
    if (confirm('Tem certeza que deseja excluir este comentário?')) {
        showNotification(`Comentário ${commentId} excluído`, 'success');
        // Reload comments
        loadComments();
    }
}

// Adicionar estilos CSS dinâmicos para notificações
const notificationStyles = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0.2rem;
}

.status-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
}

.status-badge.published {
    background: #d4edda;
    color: #155724;
}

.status-badge.draft {
    background: #fff3cd;
    color: #856404;
}

.status-badge.active {
    background: #d4edda;
    color: #155724;
}

.role-badge {
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 500;
}

.role-badge.admin {
    background: #d1ecf1;
    color: #0c5460;
}

.role-badge.editor {
    background: #d4edda;
    color: #155724;
}

.role-badge.user {
    background: #e2e3e5;
    color: #383d41;
}

.action-buttons {
    display: flex;
    gap: 0.3rem;
}

.no-data {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    font-style: italic;
}
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);