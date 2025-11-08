#!/bin/bash

echo "💥 APLICANDO SOLUÇÃO NUCLEAR..."

cd ~/Seehere

# 1. REMOVER CONFIGURAÇÕES PROBLEMÁTICAS
echo "🗑️ Removendo configurações problemáticas..."
rm -f vercel.json
rm -f frontend/package.json

# 2. USAR CAMINHOS RELATIVOS SIMPLES - SEM VERCEL.JSON
echo "🔧 Aplicando caminhos relativos simples..."

# Frontend - caminhos relativos
sed -i 's|href="/src/style.css"|href="src/style.css"|g' frontend/index.html
sed -i 's|src="/src/main.js"|src="src/main.js"|g' frontend/index.html
sed -i 's|href="/src/style.css"|href="src/style.css"|g' frontend/index.html
sed -i 's|src="/src/main.js"|src="src/main.js"|g' frontend/index.html

# Painel - caminhos relativos
sed -i 's|href="/src/style.css"|href="src/style.css"|g' painel/index.html
sed -i 's|src="/src/admin.js"|src="src/admin.js"|g' painel/index.html
sed -i 's|href="/src/style.css"|href="src/style.css"|g' painel/admin-login.html

# 3. ATUALIZAR URLs DA API PARA PRODUÇÃO
echo "🔗 Atualizando URLs da API..."
RENDER_URL="https://seehere-backend.onrender.com"
sed -i "s|http://localhost:3000/api|${RENDER_URL}/api|g" frontend/src/main.js
sed -i "s|http://localhost:3000/api|${RENDER_URL}/api|g" painel/src/admin.js
sed -i "s|http://localhost:3000/api|${RENDER_URL}/api|g" painel/admin-login.html

# 4. VERIFICAR ESTRUTURA FINAL
echo ""
echo "📁 ESTRUTURA FINAL:"
echo "HTML files:"
find . -name "*.html" -type f
echo ""
echo "CSS files:"
find . -name "*.css" -type f
echo ""
echo "JS files:"
find . -name "*.js" -type f | grep -v node_modules

# 5. VERIFICAR CAMINHOS CORRETOS
echo ""
echo "🔍 CAMINHOS NOS HTMLs:"
echo "=== FRONTEND ==="
grep -E "style.css|main.js" frontend/index.html
echo ""
echo "=== PAINEL ==="
grep -E "style.css|admin.js" painel/index.html

echo ""
echo "💥 SOLUÇÃO NUCLEAR COMPLETA!"
echo "📤 Agora o Vercel vai detectar automaticamente a estrutura!"
echo ""
echo "git add ."
echo "git commit -m 'nuclear: remover configurações e usar detecção automática'"
echo "git push origin main"
