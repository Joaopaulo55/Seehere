// Configurações
const API_BASE = 'https://seehere-backend.onrender.com';
let currentUser = null;
let currentPage = 1;
let totalPages = 1;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Painel Admin Seehere Inicializado');
    checkCurrentRoute();
    initializeAdmin();
    setupEventListeners();
});

// Funções de Inicialização
function initializeAdmin() {
    console.log('🚀 Inicializando Painel Admin...');
    console.log('📊 Dados iniciais:', {
        url: window.location.href,
        hasToken: !!localStorage.getItem('adminToken'),
        hasUser: !!localStorage.getItem('adminUser'),
        path: window.location.pathname
    });
    
    checkAuth();
    setupNavigation();
    loadTheme();
}

function checkCurrentRoute() {
    const currentPath = window.location.pathname;
    console.log('📍 Rota atual:', currentPath);
    
    if (currentPath.includes('admin-login.html')) {
        const token = localStorage.getItem('adminToken');
        const user = localStorage.getItem('adminUser');
        
        if (token && user) {
            console.log('🔄 Já autenticado, redirecionando para painel...');
            window.location.replace('index.html');
        }
    }
}

async function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    console.log('🔐 Verificando autenticação...', { 
        hasToken: !!token, 
        hasUserData: !!userData 
    });
    
    if (!token || !userData) {
        console.log('❌ Sem token ou dados de usuário, redirecionando para login');
        redirectToLogin();
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        updateUserInfo();
        
        console.log('✅ Usuário carregado do localStorage:', currentUser.email);
        
        await verifyTokenWithTimeout(token);
        
    } catch (error) {
        console.error('❌ Erro na verificação de autenticação:', error);
        
        if (error.message.includes('Token inválido') || error.message.includes('Timeout')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            redirectToLogin();
        }
    }
}

async function verifyTokenWithTimeout(token) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    
    const verificationPromise = fetch(`${API_BASE}/api/auth/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    const response = await Promise.race([verificationPromise, timeoutPromise]);
    
    if (!response.ok) {
        throw new Error('Token inválido');
    }
    
    const data = await response.json();
    currentUser = data.user;
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    updateUserInfo();
    
    return true;
}

function redirectToLogin() {
    window.location.replace('admin-login.html');
}

function updateUserInfo() {
    if (currentUser) {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        const avatar = document.getElementById('adminAvatar');
        
        if (adminName) adminName.textContent = currentUser.displayName || 'Administrador';
        if (adminEmail) adminEmail.textContent = currentUser.email || 'admin@seehere.com';
        
        if (avatar && currentUser.avatarUrl) {
            avatar.src = currentUser.avatarUrl;
        } else if (avatar) {
            const name = currentUser.displayName || currentUser.email || 'Admin';
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007bff&color=fff`;
        }
    }
}

function setupEventListeners() {
    const eventConfig = [
        { element: 'sidebarToggle', event: 'click', handler: toggleSidebar },
        { element: 'notificationBtn', event: 'click', handler: toggleNotifications },
        { element: 'addVideoForm', event: 'submit', handler: handleAddVideo },
        { element: 'addCollectionForm', event: 'submit', handler: handleAddCollection },
        { element: 'videoSearch', event: 'input', handler: debounce(searchVideos, 500) },
        { element: 'prevPage', event: 'click', handler: goToPrevPage },
        { element: 'nextPage', event: 'click', handler: goToNextPage }
    ];

    eventConfig.forEach(config => {
        try {
            const element = typeof config.element === 'string' 
                ? document.getElementById(config.element)
                : config.element;
            
            if (element && config.handler) {
                element.addEventListener(config.event, config.handler);
            }
        } catch (error) {
            console.error(`Erro ao adicionar event listener para ${config.element}:`, error);
        }
    });

    setupModalEventListeners();
    setupNavigationEventListeners();
    setupWindowEventListeners();
    initializeSavedState();
}

function setupModalEventListeners() {
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    document.addEventListener('click', function(event) {
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationBtn = document.getElementById('notificationBtn');
        
        if (notificationsPanel?.classList.contains('show') && 
            !notificationsPanel.contains(event.target) && 
            !notificationBtn?.contains(event.target)) {
            closeNotifications();
        }
    });
}

function setupNavigationEventListeners() {
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === '/') {
            event.preventDefault();
            const searchInput = document.getElementById('videoSearch');
            if (searchInput) {
                searchInput.focus();
                showNotification('Busca focada - use Ctrl+/ novamente para voltar', 'info', 2000);
            }
        }
        
        if (event.key === 'Escape') {
            closeAllModalsAndPanels();
        }
        
        if (event.key >= '1' && event.key <= '7' && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            const pageIndex = parseInt(event.key) - 1;
            const navLinks = document.querySelectorAll('.nav-link');
            if (navLinks[pageIndex]) {
                navLinks[pageIndex].click();
            }
        }
    });
}

function setupWindowEventListeners() {
    window.addEventListener('online', () => {
        showNotification('Conexão restaurada', 'success', 3000);
        if (document.getElementById('videos')?.classList.contains('active')) {
            loadVideos();
        }
    });

    window.addEventListener('offline', () => {
        showNotification('Conexão perdida - modo offline', 'warning', 5000);
    });

    window.addEventListener('beforeunload', (event) => {
        const hasUnsavedChanges = document.querySelectorAll('form.dirty').length > 0;
        if (hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = 'Você tem alterações não salvas. Tem certeza que deseja sair?';
            return event.returnValue;
        }
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (sidebar && mainContent) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
    }
}

function toggleNotifications() {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.getElementById('notificationBtn');
    
    if (panel && btn) {
        const isOpening = !panel.classList.contains('show');
        panel.classList.toggle('show');
        
        if (isOpening) {
            btn.classList.add('active');
            loadNotifications();
        } else {
            btn.classList.remove('active');
        }
    }
}

function closeNotifications() {
    const panel = document.getElementById('notificationsPanel');
    const btn = document.getElementById('notificationBtn');
    
    if (panel) panel.classList.remove('show');
    if (btn) btn.classList.remove('active');
}

function closeAllModalsAndPanels() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    closeNotifications();
    hideLoading();
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadVideos();
        updatePaginationInfo();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadVideos();
        updatePaginationInfo();
    }
}

function initializeSavedState() {
    const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebarCollapsed) {
        document.getElementById('sidebar')?.classList.add('collapsed');
    }
    
    const savedSearch = localStorage.getItem('lastVideoSearch');
    if (savedSearch && document.getElementById('videoSearch')) {
        document.getElementById('videoSearch').value = savedSearch;
    }
    
    const lastActivePage = localStorage.getItem('lastActivePage');
    if (lastActivePage) {
        const navLink = document.querySelector(`[href="#${lastActivePage}"]`);
        if (navLink) navLink.click();
    }
}

// Navegação
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href');
            
            if (target.startsWith('#')) {
                const pageId = target.substring(1);
                showPage(pageId);
                
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    const hash = window.location.hash.substring(1);
    const initialPage = hash || 'dashboard';
    showPage(initialPage);
    
    const activeLink = document.querySelector(`.nav-link[href="#${initialPage}"]`);
    if (activeLink) activeLink.classList.add('active');
}

function showPage(pageId) {
    document.querySelectorAll('.content-page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    const pageTitle = document.getElementById('pageTitle');
    const activeLink = document.querySelector(`.nav-link.active span`);
    if (pageTitle && activeLink) {
        pageTitle.textContent = activeLink.textContent;
    }
    
    localStorage.setItem('lastActivePage', pageId);
    
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
        case 'settings':
            loadSettings();
            break;
    }
}

// Dashboard
async function loadDashboardData() {
    showLoading();
    
    try {
        await loadBasicStats();
        await loadRecentVideos();
        await loadRecentActivity();
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dados do dashboard', 'error');
    } finally {
        hideLoading();
    }
}

async function loadBasicStats() {
    try {
        const response = await fetch(`${API_BASE}/api/videos?limit=1000`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const videos = data.videos || [];
            
            const totalVideos = videos.length;
            const totalViews = videos.reduce((sum, video) => sum + (video.viewsCount || 0), 0);
            const totalLikes = videos.reduce((sum, video) => sum + (video.likesCount || 0), 0);
            
            document.getElementById('totalVideos').textContent = totalVideos;
            document.getElementById('totalViews').textContent = totalViews.toLocaleString();
            document.getElementById('totalComments').textContent = '0';
            document.getElementById('totalUsers').textContent = '1';
            
        } else {
            throw new Error('Falha ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        document.getElementById('totalVideos').textContent = '0';
        document.getElementById('totalUsers').textContent = '1';
        document.getElementById('totalViews').textContent = '0';
        document.getElementById('totalComments').textContent = '0';
    }
}

async function loadRecentVideos() {
    try {
        const response = await fetch(`${API_BASE}/api/videos?limit=5`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateRecentVideos(data.videos || []);
        } else {
            throw new Error('Falha ao carregar vídeos');
        }
    } catch (error) {
        console.error('Erro ao carregar vídeos recentes:', error);
        updateRecentVideos([]);
    }
}

function updateRecentVideos(videos) {
    const container = document.getElementById('recentVideosList');
    
    if (!videos || videos.length === 0) {
        container.innerHTML = '<div class="no-data">Nenhum vídeo encontrado</div>';
        return;
    }
    
    container.innerHTML = videos.map(video => `
        <div class="recent-item">
            <h4>${video.title}</h4>
            <p>${video.owner?.displayName || 'Usuário'}</p>
            <div class="video-stats">
                <span>👁️ ${video.viewsCount || 0}</span>
                <span>❤️ ${video.likesCount || 0}</span>
            </div>
        </div>
    `).join('');
}

async function loadRecentActivity() {
    try {
        const sampleActivities = [
            { 
                type: 'video', 
                message: 'Sistema inicializado', 
                time: new Date().toLocaleTimeString('pt-BR'),
                icon: 'play'
            },
            { 
                type: 'system', 
                message: 'Painel admin carregado', 
                time: new Date().toLocaleTimeString('pt-BR'),
                icon: 'cog'
            }
        ];
        
        updateRecentActivity(sampleActivities);
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        updateRecentActivity([]);
    }
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (!activities || activities.length === 0) {
        container.innerHTML = '<div class="no-data">Nenhuma atividade recente</div>';
        return;
    }
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas fa-${activity.icon || 'bell'}"></i>
            </div>
            <div class="activity-content">
                <p>${activity.message}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        </div>
    `).join('');
}

// Gerenciamento de Vídeos
async function loadVideos() {
    showLoading();
    
    try {
        const search = document.getElementById('videoSearch')?.value || '';
        
        let url = `${API_BASE}/api/videos?limit=1000`;
        
        const response = await fetch(url, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            let videos = data.videos || [];
            
            if (search) {
                videos = videos.filter(video => 
                    video.title.toLowerCase().includes(search.toLowerCase()) ||
                    (video.description && video.description.toLowerCase().includes(search.toLowerCase()))
                );
            }
            
            updateVideosTable(videos);
            updatePaginationInfo();
        } else {
            throw new Error('Falha ao carregar vídeos');
        }
    } catch (error) {
        console.error('Erro ao carregar vídeos:', error);
        showNotification('Erro ao carregar vídeos', 'error');
        updateVideosTable([]);
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
                <img src="${video.thumbnailUrl || 'https://via.placeholder.com/80x45?text=No+Thumbnail'}" 
                     alt="Thumbnail" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>
                <strong>${video.title}</strong>
                ${video.description ? `<br><small>${video.description}</small>` : ''}
            </td>
            <td>${video.viewsCount || 0}</td>
            <td>${video.likesCount || 0}</td>
            <td>
                <span class="status-badge published">Publicado</span>
            </td>
            <td>${new Date(video.createdAt).toLocaleDateString('pt-BR')}</td>
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

// Coleções
async function loadCollections() {
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/collections`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateCollectionsGrid(data.collections || []);
        } else {
            throw new Error('Falha ao carregar coleções');
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
        showNotification('Erro ao carregar coleções', 'error');
        updateCollectionsGrid([]);
    } finally {
        hideLoading();
    }
}

function updateCollectionsGrid(collections) {
    const grid = document.getElementById('collectionsGrid');
    
    if (!collections || collections.length === 0) {
        grid.innerHTML = '<div class="no-data">Nenhuma coleção encontrada</div>';
        return;
    }
    
    grid.innerHTML = collections.map(collection => `
        <div class="collection-card">
            <div class="collection-image">
                ${collection.thumbnailUrl ? 
                    `<img src="${collection.thumbnailUrl}" alt="${collection.name}" onerror="this.style.display='none'">` :
                    `<i class="fas fa-folder"></i>`
                }
            </div>
            <div class="collection-content">
                <h3>${collection.name}</h3>
                <p>${collection.description || 'Sem descrição'}</p>
                <div class="collection-stats">
                    <span>${collection.videos?.length || 0} vídeos</span>
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

// Usuários
async function loadUsers() {
    showLoading();
    
    try {
        const users = [currentUser].filter(Boolean);
        updateUsersTable(users);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        showNotification('Erro ao carregar usuários', 'error');
        updateUsersTable([]);
    } finally {
        hideLoading();
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-data">Nenhum usuário encontrado</td>
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
                <span class="role-badge ${(user.role || 'ADMIN').toLowerCase()}">${user.role || 'ADMIN'}</span>
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Comentários
async function loadComments() {
    showLoading();
    
    try {
        updateCommentsList([]);
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        showNotification('Erro ao carregar comentários', 'error');
        updateCommentsList([]);
    } finally {
        hideLoading();
    }
}

function updateCommentsList(comments) {
    const container = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <p>Nenhum comentário para moderar</p>
                <p><small>Funcionalidade em desenvolvimento</small></p>
            </div>
        `;
        return;
    }
}

// Analytics
async function loadAnalytics() {
    showLoading();
    
    try {
        await loadGeneralStats();
        await loadPopularVideos();
    } catch (error) {
        console.error('Erro ao carregar analytics:', error);
        showNotification('Erro ao carregar analytics', 'error');
    } finally {
        hideLoading();
    }
}

async function loadGeneralStats() {
    const container = document.getElementById('generalStats');
    container.innerHTML = `
        <div class="stat-item">
            <strong>Vídeos no sistema:</strong> <span id="statsTotalVideos">0</span>
        </div>
        <div class="stat-item">
            <strong>Total de visualizações:</strong> <span id="statsTotalViews">0</span>
        </div>
        <div class="stat-item">
            <strong>Usuários ativos:</strong> <span id="statsTotalUsers">1</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/videos?limit=1000`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const videos = data.videos || [];
            const totalViews = videos.reduce((sum, video) => sum + (video.viewsCount || 0), 0);
            
            document.getElementById('statsTotalVideos').textContent = videos.length;
            document.getElementById('statsTotalViews').textContent = totalViews.toLocaleString();
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function loadPopularVideos() {
    try {
        const response = await fetch(`${API_BASE}/api/videos?limit=10`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const videos = data.videos || [];
            
            const popularVideos = videos
                .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
                .slice(0, 5);
            
            updatePopularVideos(popularVideos);
        }
    } catch (error) {
        console.error('Erro ao carregar vídeos populares:', error);
        updatePopularVideos([]);
    }
}

function updatePopularVideos(videos) {
    const container = document.getElementById('popularVideos');
    
    if (!videos || videos.length === 0) {
        container.innerHTML = '<div class="no-data">Nenhum dado disponível</div>';
        return;
    }
    
    container.innerHTML = videos.map(video => `
        <div class="video-stat-item">
            <strong>${video.title}</strong>
            <div class="video-stats">
                <span>👁️ ${video.viewsCount || 0}</span>
                <span>❤️ ${video.likesCount || 0}</span>
            </div>
        </div>
    `).join('');
}

// Configurações
async function loadSettings() {
    document.getElementById('siteName').value = 'Seehere';
    document.getElementById('siteDescription').value = 'Plataforma de streaming';
    await checkSystemStatus();
}

async function checkSystemStatus() {
    const statusElement = document.getElementById('backendStatus');
    const lastUpdateElement = document.getElementById('lastUpdate');
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        if (response.ok) {
            statusElement.textContent = '✅ Online';
            statusElement.style.color = '#28a745';
        } else {
            throw new Error('Backend offline');
        }
    } catch (error) {
        statusElement.textContent = '❌ Offline';
        statusElement.style.color = '#dc3545';
    }
    
    lastUpdateElement.textContent = new Date().toLocaleString('pt-BR');
}

function saveSettings() {
    showNotification('Configurações salvas com sucesso!', 'success');
}

// Modal Functions
function showAddVideoModal() {
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
        tags: document.getElementById('videoTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/videos`, {
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
            loadVideos();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao adicionar vídeo');
        }
    } catch (error) {
        console.error('Erro ao adicionar vídeo:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function handleAddCollection(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('collectionName').value,
        description: document.getElementById('collectionDescription').value,
        thumbnailUrl: document.getElementById('collectionThumbnail').value
    };
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/collections`, {
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
            loadCollections();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao criar coleção');
        }
    } catch (error) {
        console.error('Erro ao criar coleção:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Utility Functions
function getAuthHeaders() {
    const token = localStorage.getItem('adminToken');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('show');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
}

function showNotification(message, type = 'info', duration = 5000) {
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
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
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, duration);
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

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('adminTheme', newTheme);
    
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('adminTheme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function logout() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    window.location.href = 'admin-login.html';
}

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
    showNotification(`Editando vídeo ${videoId} - Funcionalidade em desenvolvimento`, 'info');
}

async function deleteVideo(videoId) {
    if (confirm('Tem certeza que deseja excluir este vídeo?')) {
        showLoading();
        try {
            const response = await fetch(`${API_BASE}/api/videos/${videoId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Vídeo excluído com sucesso!', 'success');
                loadVideos();
            } else {
                throw new Error('Falha ao excluir vídeo');
            }
        } catch (error) {
            console.error('Erro ao excluir vídeo:', error);
            showNotification('Erro ao excluir vídeo', 'error');
        } finally {
            hideLoading();
        }
    }
}

function viewVideoAnalytics(videoId) {
    showNotification(`Analytics do vídeo ${videoId} - Funcionalidade em desenvolvimento`, 'info');
}

function editCollection(collectionId) {
    showNotification(`Editando coleção ${collectionId} - Funcionalidade em desenvolvimento`, 'info');
}

async function deleteCollection(collectionId) {
    if (confirm('Tem certeza que deseja excluir esta coleção?')) {
        showLoading();
        try {
            const response = await fetch(`${API_BASE}/api/collections/${collectionId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Coleção excluída com sucesso!', 'success');
                loadCollections();
            } else {
                throw new Error('Falha ao excluir coleção');
            }
        } catch (error) {
            console.error('Erro ao excluir coleção:', error);
            showNotification('Erro ao excluir coleção', 'error');
        } finally {
            hideLoading();
        }
    }
}

function editUser(userId) {
    showNotification(`Editando usuário ${userId} - Funcionalidade em desenvolvimento`, 'info');
}

function searchVideos() {
    localStorage.setItem('lastVideoSearch', document.getElementById('videoSearch')?.value || '');
    loadVideos();
}

function updatePaginationInfo() {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
}

// Notifications
async function loadNotifications() {
    try {
        setTimeout(() => {
            const notifications = getSampleNotifications();
            updateNotificationsList(notifications);
        }, 500);
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        updateNotificationsList(getSampleNotifications());
    }
}

function updateNotificationsList(notifications) {
    const container = document.getElementById('notificationsList');
    if (!container) return;

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-bell-slash"></i>
                <p>Nenhuma notificação</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.unread ? 'unread' : ''}">
            <div class="notification-icon">
                <i class="fas fa-${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <p>${notification.message}</p>
                <span class="notification-time">${formatTime(notification.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

function getSampleNotifications() {
    return [
        {
            id: 1,
            type: 'info',
            message: 'Sistema inicializado com sucesso',
            timestamp: new Date(),
            unread: true
        },
        {
            id: 2,
            type: 'success',
            message: 'Backend conectado com sucesso',
            timestamp: new Date(Date.now() - 300000),
            unread: true
        },
        {
            id: 3,
            type: 'warning',
            message: 'Alguns vídeos precisam de moderação',
            timestamp: new Date(Date.now() - 1800000),
            unread: false
        }
    ];
}

function formatTime(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours} h atrás`;
    return `${days} dias atrás`;
}

// Adicionar estilos CSS dinâmicos
const dynamicStyles = `
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

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
}

.stat-item {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
}

.stat-item:last-child {
    border-bottom: none;
}

.video-stat-item {
    padding: 0.8rem;
    background: var(--bg-color);
    border-radius: var(--border-radius);
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color);
}

.system-info p {
    margin-bottom: 0.5rem;
    padding: 0.3rem 0;
}

.notifications-panel {
    position: fixed;
    top: 0;
    right: -400px;
    width: 400px;
    height: 100vh;
    background: var(--bg-color);
    box-shadow: -2px 0 10px rgba(0,0,0,0.1);
    transition: right 0.3s ease;
    z-index: 1000;
}

.notifications-panel.show {
    right: 0;
}

.notifications-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.notifications-header h3 {
    margin: 0;
    flex: 1;
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
    background: #e2e3e5;
    color: #383d41;
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    color: white;
}

.loading-overlay.show {
    display: flex;
}

.loading-spinner {
    text-align: center;
}

.loading-spinner i {
    font-size: 2rem;
    margin-bottom: 1rem;
}
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);