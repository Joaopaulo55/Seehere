// Configurações
const API_BASE = 'https://seehere-backend.onrender.com';
let currentUser = null;
let currentPage = 1;
let totalPages = 1;
let currentMegaFolderUrl = '';

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
    checkAuth();
    setupNavigation();
    loadTheme();
}

// Verificar rota atual
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

// Verificar autenticação
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
        
        // Verificar se é admin
        if (currentUser.role !== 'ADMIN') {
            showNotification('❌ Acesso negado. Apenas administradores podem acessar este painel.', 'error');
            setTimeout(() => logout(), 2000);
            return;
        }
        
        console.log('✅ Usuário admin carregado:', currentUser.email);
        
        await verifyTokenWithTimeout(token);
        
    } catch (error) {
        console.error('❌ Erro na verificação de autenticação:', error);
        
        if (error.message.includes('Token inválido') || error.message.includes('Timeout') || error.message.includes('Privilégios')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            redirectToLogin();
        }
    }
}

// Verificar token com timeout
async function verifyTokenWithTimeout(token) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    
    const verificationPromise = fetch(`${API_BASE}/api/auth/verify`, {
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
    
    // Verificar se ainda é admin
    if (data.user.role !== 'ADMIN') {
        throw new Error('Privilégios de administrador revogados');
    }
    
    currentUser = data.user;
    localStorage.setItem('adminUser', JSON.stringify(data.user));
    updateUserInfo();
    
    return true;
}

// Redirecionar para login
function redirectToLogin() {
    window.location.replace('admin-login.html');
}

// Atualizar informações do usuário
function updateUserInfo() {
    if (currentUser) {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        const avatar = document.getElementById('adminAvatar');
        
        if (adminName) adminName.textContent = currentUser.displayName || 'Administrador';
        if (adminEmail) adminEmail.textContent = currentUser.email;
        
        if (avatar) {
            if (currentUser.avatarUrl) {
                avatar.src = currentUser.avatarUrl;
            } else {
                const name = currentUser.displayName || currentUser.email || 'Admin';
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007bff&color=fff`;
            }
        }
    }
}

// Configurar event listeners
function setupEventListeners() {
    const eventConfig = [
        { element: 'sidebarToggle', event: 'click', handler: toggleSidebar },
        { element: 'notificationBtn', event: 'click', handler: toggleNotifications },
        { element: 'addCollectionForm', event: 'submit', handler: handleAddCollection },
        { element: 'importMegaVideoForm', event: 'submit', handler: handleImportMegaVideo },
        { element: 'videoSearch', event: 'input', handler: debounce(searchVideos, 500) },
        { element: 'prevPage', event: 'click', handler: goToPrevPage },
        { element: 'nextPage', event: 'click', handler: goToNextPage },
        { element: 'scanMegaFolderBtn', event: 'click', handler: scanMegaFolder }
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

// Configurar listeners de modal
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

// Configurar listeners de navegação
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

// Configurar listeners da janela
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

// Inicializar estado salvo
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
        case 'megaVideos':
            showMegaVideosPage();
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
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = data.stats || {};
            
            document.getElementById('totalVideos').textContent = stats.totalVideos || 0;
            document.getElementById('totalViews').textContent = stats.totalViews?.toLocaleString() || '0';
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            
        } else {
            throw new Error('Falha ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        document.getElementById('totalVideos').textContent = '0';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalViews').textContent = '0';
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
        
        const response = await fetch(`${API_BASE}/api/admin/videos?limit=1000`, {
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
        const response = await fetch(`${API_BASE}/api/admin/collections`, {
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
                    <span>${collection._count?.videos || 0} vídeos</span>
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
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateUsersTable(data.users || []);
        } else {
            throw new Error('Falha ao carregar usuários');
        }
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
                        <br>
                        <small>${user.email}</small>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="role-badge ${user.role.toLowerCase()}">${user.role}</span>
            </td>
            <td>
                <span class="status-badge ${user.isActive ? 'published' : 'draft'}">
                    ${user.isActive ? 'Ativo' : 'Inativo'}
                </span>
                ${user.isVerified ? '<br><small style="color: #28a745;">✓ Verificado</small>' : ''}
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')" ${user.id === currentUser?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="viewUserDetails('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// MEGA Videos
function showMegaVideosPage() {
    showPage('megaVideos');
    document.getElementById('megaFolderUrl').value = currentMegaFolderUrl;
    
    if (currentMegaFolderUrl) {
        loadMegaVideos();
    }
}

async function scanMegaFolder() {
    const folderUrl = document.getElementById('megaFolderUrl').value.trim();
    
    if (!folderUrl) {
        showNotification('Cole a URL da pasta MEGA', 'error');
        return;
    }

    // Validar formato da URL
    if (!folderUrl.includes('mega.nz/folder/') || !folderUrl.includes('#')) {
        showNotification('URL inválida. Formato: https://mega.nz/folder/ID#CHAVE', 'error');
        return;
    }

    showLoading();
    currentMegaFolderUrl = folderUrl;

    try {
        const response = await fetch(`${API_BASE}/api/admin/scan-mega-folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({ folderUrl })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Falha no scan da pasta');
        }

        updateMegaVideosUI(data);
        showNotification(`✅ Encontrados ${data.stats.totalInMega} vídeos`, 'success');

    } catch (error) {
        console.error('Erro ao escanear pasta MEGA:', error);
        showNotification(`❌ ${error.message}`, 'error');
        updateMegaVideosUI({ notInDatabase: [], alreadyInDatabase: [] });
    } finally {
        hideLoading();
    }
}

function updateMegaVideosUI(data) {
    const notImportedContainer = document.getElementById('megaNotImported');
    const importedContainer = document.getElementById('megaImported');
    const statsContainer = document.getElementById('megaStats');
    
    if (!data.notInDatabase || !data.alreadyInDatabase) {
        notImportedContainer.innerHTML = '<div class="no-data">Erro ao carregar dados</div>';
        importedContainer.innerHTML = '<div class="no-data">Erro ao carregar dados</div>';
        return;
    }

    // Stats
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-item">
                <strong>Total no MEGA:</strong> ${data.stats?.totalInMega || 0}
            </div>
            <div class="stat-item">
                <strong>Não importados:</strong> ${data.stats?.notImported || 0}
            </div>
            <div class="stat-item">
                <strong>Já importados:</strong> ${data.stats?.alreadyImported || 0}
            </div>
            <div class="stat-item">
                <strong>Pasta:</strong> <span style="word-break: break-all; font-size: 0.9rem;">${currentMegaFolderUrl}</span>
            </div>
        `;
    }

    // Not imported videos
    if (data.notInDatabase.length === 0) {
        notImportedContainer.innerHTML = '<div class="no-data">Nenhum vídeo não importado encontrado</div>';
    } else {
        notImportedContainer.innerHTML = data.notInDatabase.map(file => `
            <div class="mega-file-card">
                <div class="file-info">
                    <h4>${file.name}</h4>
                    <p>📏 Tamanho: ${file.formattedSize}</p>
                    <p>🆔 ID: ${file.downloadId}</p>
                    <small>📅 ${new Date(file.timestamp).toLocaleDateString('pt-BR')}</small>
                </div>
                <div class="file-actions">
                    <button class="btn btn-sm btn-primary" onclick="showImportModal(
                        '${file.downloadId}', 
                        '${file.downloadUrl}',
                        '${file.name.replace(/'/g, "\\'")}',
                        ${file.size}
                    )">
                        <i class="fas fa-download"></i> Importar
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Already imported videos
    if (data.alreadyInDatabase.length === 0) {
        importedContainer.innerHTML = '<div class="no-data">Nenhum vídeo importado encontrado</div>';
    } else {
        importedContainer.innerHTML = data.alreadyInDatabase.map(file => `
            <div class="mega-file-card imported">
                <div class="file-info">
                    <h4>${file.existingTitle || file.name}</h4>
                    <p>📁 Arquivo: ${file.name}</p>
                    <p>📏 Tamanho: ${file.formattedSize}</p>
                    <p>🆔 ID: ${file.downloadId}</p>
                    <small>📅 ${new Date(file.timestamp).toLocaleDateString('pt-BR')}</small>
                </div>
                <div class="file-status">
                    <span class="status-badge published">✅ Importado</span>
                </div>
            </div>
        `).join('');
    }
}

function showImportModal(megaFileId, downloadUrl, fileName, fileSize) {
    document.getElementById('importMegaFileId').value = megaFileId;
    document.getElementById('importDownloadUrl').value = downloadUrl;
    document.getElementById('importFileName').textContent = fileName;
    document.getElementById('importFileSize').textContent = `Tamanho: ${formatBytes(fileSize)}`;
    
    // Sugerir título baseado no nome do arquivo (sem extensão)
    const suggestedTitle = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    document.getElementById('importVideoTitle').value = suggestedTitle;
    
    // Carregar coleções para o select
    loadCollectionsForImportModal();
    
    document.getElementById('importMegaVideoModal').style.display = 'block';
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

async function handleImportMegaVideo(e) {
    e.preventDefault();
    
    const megaFileId = document.getElementById('importMegaFileId').value;
    const downloadUrl = document.getElementById('importDownloadUrl').value;
    const fileName = document.getElementById('importFileName').textContent;
    const title = document.getElementById('importVideoTitle').value;
    const description = document.getElementById('importVideoDescription').value;
    const tags = document.getElementById('importVideoTags').value;
    const thumbnailUrl = document.getElementById('importThumbnailUrl').value;
    const collectionId = document.getElementById('importCollection').value;
    
    // Extrair tamanho do texto
    const sizeText = document.getElementById('importFileSize').textContent;
    const sizeMatch = sizeText.match(/[\d.]+/);
    const size = sizeMatch ? parseFloat(sizeMatch[0]) * 1024 * 1024 : 0; // Assumindo MB

    if (!title) {
        showNotification('Título é obrigatório', 'error');
        return;
    }

    showLoading();
    
    try {
        const response = await fetch(`${API_BASE}/api/mega/import-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify({
                megaFileId,
                downloadUrl,
                name: fileName,
                title,
                description,
                tags,
                thumbnailUrl,
                collectionId,
                size
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showNotification('✅ Vídeo importado com sucesso!', 'success');
            closeModal('importMegaVideoModal');
            scanMegaFolder(); // Recarregar a lista
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao importar vídeo');
        }
    } catch (error) {
        console.error('Erro ao importar vídeo:', error);
        showNotification(`❌ ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function loadCollectionsForImportModal() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/collections`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const select = document.getElementById('importCollection');
            
            if (select && data.collections) {
                select.innerHTML = '<option value="">Nenhuma coleção</option>';
                
                data.collections.forEach(collection => {
                    const option = document.createElement('option');
                    option.value = collection.id;
                    option.textContent = collection.name;
                    select.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar coleções:', error);
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
            <strong>Usuários ativos:</strong> <span id="statsTotalUsers">0</span>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/api/admin/dashboard`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const stats = data.stats || {};
            
            document.getElementById('statsTotalVideos').textContent = stats.totalVideos || 0;
            document.getElementById('statsTotalViews').textContent = stats.totalViews?.toLocaleString() || '0';
            document.getElementById('statsTotalUsers').textContent = stats.totalUsers || 0;
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
    try {
        const response = await fetch(`${API_BASE}/api/admin/settings`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const settings = data.settings || {};
            
            document.getElementById('siteName').value = settings.siteName || 'Seehere';
            document.getElementById('siteDescription').value = settings.siteDescription || 'Plataforma de streaming';
            
            await checkSystemStatus();
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        document.getElementById('siteName').value = 'Seehere';
        document.getElementById('siteDescription').value = 'Plataforma de streaming';
    }
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

async function saveSettings() {
    showLoading();
    
    try {
        const settings = {
            siteName: document.getElementById('siteName').value,
            siteDescription: document.getElementById('siteDescription').value
        };
        
        const response = await fetch(`${API_BASE}/api/admin/settings`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(settings)
        });
        
        if (response.ok) {
            showNotification('Configurações salvas com sucesso!', 'success');
        } else {
            throw new Error('Falha ao salvar configurações');
        }
    } catch (error) {
        console.error('Erro ao salvar configurações:', error);
        showNotification('Erro ao salvar configurações', 'error');
    } finally {
        hideLoading();
    }
}

// Modal Functions
function showAddCollectionModal() {
    document.getElementById('addCollectionModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form Handlers
async function handleAddCollection(e) {
    e.preventDefault();
    
    const formData = {
        name: document.getElementById('collectionName').value,
        description: document.getElementById('collectionDescription').value,
        thumbnailUrl: document.getElementById('collectionThumbnail').value || null
    };
    
    if (!formData.name) {
        showNotification('Nome da coleção é obrigatório', 'error');
        return;
    }
    
    showLoading();
    
    try {
        console.log('📤 Enviando dados para criar coleção:', formData);
        
        const response = await fetch(`${API_BASE}/api/admin/collections`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        console.log('📥 Resposta do servidor:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Coleção criada:', result);
            showNotification('Coleção criada com sucesso!', 'success');
            closeModal('addCollectionModal');
            document.getElementById('addCollectionForm').reset();
            loadCollections();
        } else {
            const errorData = await response.json();
            console.error('❌ Erro do servidor:', errorData);
            throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Erro ao criar coleção:', error);
        showNotification(`❌ ${error.message}`, 'error');
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

// UI Functions
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

function updatePaginationInfo() {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }
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

async function deleteUser(userId) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        showLoading();
        try {
            const response = await fetch(`${API_BASE}/api/users/${userId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                showNotification('Usuário excluído com sucesso!', 'success');
                loadUsers();
            } else {
                throw new Error('Falha ao excluir usuário');
            }
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            showNotification('Erro ao excluir usuário', 'error');
        } finally {
            hideLoading();
        }
    }
}

function viewUserDetails(userId) {
    showNotification(`Detalhes do usuário ${userId} - Funcionalidade em desenvolvimento`, 'info');
}

function searchVideos() {
    localStorage.setItem('lastVideoSearch', document.getElementById('videoSearch')?.value || '');
    loadVideos();
}

// Notifications
async function loadNotifications() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/notifications`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            updateNotificationsList(data.notifications || []);
        } else {
            throw new Error('Falha ao carregar notificações');
        }
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
        <div class="notification-item ${notification.read ? '' : 'unread'}">
            <div class="notification-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notification-content">
                <p>${notification.message || 'Nova notificação'}</p>
                <span class="notification-time">${formatTime(notification.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function getSampleNotifications() {
    return [
        {
            id: 1,
            message: 'Sistema inicializado com sucesso',
            createdAt: new Date(),
            read: false
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

.mega-file-card {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 1rem;
    margin-bottom: 1rem;
    background: var(--bg-color);
}

.mega-file-card.imported {
    opacity: 0.7;
    background: var(--bg-secondary);
}

.file-info h4 {
    margin: 0 0 0.5rem 0;
    color: var(--text-color);
}

.file-actions {
    margin-top: 1rem;
}

.file-status {
    margin-top: 1rem;
}
`;

// Inject dynamic styles
const styleSheet = document.createElement('style');
styleSheet.textContent = dynamicStyles;
document.head.appendChild(styleSheet);