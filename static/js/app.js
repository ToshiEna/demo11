// Store Demand Prediction System JavaScript

class StoreDemandPredictionApp {
    constructor() {
        this.currentTab = 'quick-forecast';
        this.currentRole = 'store_manager';
        this.selectedStore = null;
        this.init();
    }

    async init() {
        console.log('Store Demand Prediction System starting...');
        
        // Initialize components
        this.initEventListeners();
        await this.loadSystemStatus();
        
        // Set default dates
        this.setDefaultDates();
        
        // Load initial data
        this.loadStores();
    }

    initEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const onclickAttr = e.target.getAttribute('onclick');
                if (onclickAttr) {
                    const tabName = onclickAttr.match(/'(.*)'/)[1];
                    showTab(tabName);
                }
            });
        });

        // File upload
        const fileInput = document.getElementById('csv-file');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            const statusElement = document.getElementById('system-status-info') || document.getElementById('system-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <div class="status-item">
                        <i class="fas fa-check-circle" style="color: #28a745;"></i> 
                        System: ${data.status}
                    </div>
                    <div class="status-item">
                        <i class="fas fa-brain" style="color: ${data.prediction_models_available ? '#28a745' : '#dc3545'};"></i> 
                        ML Models: ${data.prediction_models_available ? 'Available' : 'Not Available'}
                    </div>
                    <div class="status-item">
                        <i class="fas fa-chart-bar" style="color: ${data.data_science_available ? '#28a745' : '#dc3545'};"></i> 
                        Data Science: ${data.data_science_available ? 'Available' : 'Not Available'}
                    </div>
                    <div class="status-item">
                        <i class="fas fa-graduation-cap" style="color: ${data.model_trained ? '#28a745' : '#ffc107'};"></i> 
                        Model Status: ${data.model_trained ? 'Trained' : 'Not Trained'}
                    </div>
                    <div class="status-item">
                        <i class="fas fa-cloud" style="color: ${data.azure_openai_available ? '#28a745' : '#6c757d'};"></i> 
                        Azure OpenAI: ${data.azure_openai_available ? 'Available' : 'Not Configured'}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
            const statusElement = document.getElementById('system-status-info') || document.getElementById('system-status');
            if (statusElement) {
                statusElement.innerHTML = `
                    <i class="fas fa-exclamation-triangle" style="color: #dc3545;"></i> 
                    Failed to load system status
                `;
            }
        }
    }

    setDefaultDates() {
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        
        if (startDate) startDate.value = today.toISOString().split('T')[0];
        if (endDate) endDate.value = nextWeek.toISOString().split('T')[0];
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.showNotification(`Selected file: ${file.name}`, 'info');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '5px',
            color: 'white',
            backgroundColor: type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#667eea',
            zIndex: '9999',
            transform: 'translateX(400px)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    async loadStores() {
        try {
            const response = await fetch('/api/stores');
            const data = await response.json();
            
            const storeSelector = document.getElementById('store-selector');
            if (storeSelector && data.stores) {
                storeSelector.innerHTML = '<option value="">店舗を選択してください</option>';
                data.stores.forEach(store => {
                    const option = document.createElement('option');
                    option.value = store;
                    option.textContent = store;
                    storeSelector.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load stores:', error);
            this.showNotification('Failed to load stores', 'error');
        }
    }

    async loadStoreData() {
        const storeSelector = document.getElementById('store-selector');
        const storeId = storeSelector.value;
        
        if (!storeId) {
            document.getElementById('store-dashboard').innerHTML = '';
            return;
        }
        
        this.selectedStore = storeId;
        
        try {
            // Load store dashboard data
            const response = await fetch(`/api/stores/${storeId}/dashboard`);
            const data = await response.json();
            
            this.displayStoreDashboard(data);
            this.loadStoreSKUs(storeId);
            this.loadDepartments(storeId);
            
        } catch (error) {
            console.error('Failed to load store data:', error);
            this.showNotification('Failed to load store data', 'error');
        }
    }

    displayStoreDashboard(data) {
        const dashboard = document.getElementById('store-dashboard');
        dashboard.innerHTML = `
            <div class="dashboard-card">
                <h3><i class="fas fa-boxes"></i> 取扱SKU数</h3>
                <div class="dashboard-value">${data.total_skus || 0}</div>
                <div class="dashboard-label">SKUs</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-yen-sign"></i> 月間売上</h3>
                <div class="dashboard-value">¥${(data.total_sales_30d || 0).toLocaleString()}</div>
                <div class="dashboard-label">過去30日間</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-shopping-cart"></i> 販売数量</h3>
                <div class="dashboard-value">${(data.total_qty_30d || 0).toLocaleString()}</div>
                <div class="dashboard-label">過去30日間</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-calendar-day"></i> 日平均売上</h3>
                <div class="dashboard-value">¥${(data.avg_daily_sales || 0).toLocaleString()}</div>
                <div class="dashboard-label">1日あたり</div>
            </div>
            <div class="dashboard-card">
                <h3><i class="fas fa-tags"></i> プロモーション</h3>
                <div class="dashboard-value">${data.promotion_days || 0}</div>
                <div class="dashboard-label">実施日数(30日間)</div>
            </div>
        `;
    }

    async loadStoreSKUs(storeId) {
        try {
            const response = await fetch(`/api/stores/${storeId}/skus`);
            const data = await response.json();
            
            // Store SKUs for later use
            this.storeSKUs = data.skus || [];
            
        } catch (error) {
            console.error('Failed to load store SKUs:', error);
        }
    }

    async loadDepartments(storeId) {
        try {
            const response = await fetch(`/api/stores/${storeId}/skus`);
            const data = await response.json();
            
            const departments = [...new Set(data.skus.map(sku => sku.dept).filter(dept => dept))];
            
            const deptSelector = document.getElementById('department-filter');
            if (deptSelector) {
                deptSelector.innerHTML = '<option value="">全部門</option>';
                departments.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept;
                    option.textContent = dept;
                    deptSelector.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('Failed to load departments:', error);
        }
    }
}

// Role Management Functions
function setRole(role) {
    // Update role buttons
    document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Show/hide interfaces
    document.querySelectorAll('.role-interface').forEach(interface => {
        interface.classList.remove('active');
    });
    
    if (role === 'store_manager') {
        document.getElementById('store-manager-interface').classList.add('active');
        app.currentRole = 'store_manager';
    } else {
        document.getElementById('data-analyst-interface').classList.add('active');
        app.currentRole = 'data_analyst';
    }
}

// Store Manager Functions
function loadStoreData() {
    app.loadStoreData();
}

function loadStores() {
    app.loadStores();
}

async function generateQuickForecast() {
    if (!app.selectedStore) {
        app.showNotification('店舗を選択してください', 'error');
        return;
    }
    
    const period = document.getElementById('forecast-period').value;
    const department = document.getElementById('department-filter').value;
    
    document.getElementById('quick-forecast-results').innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> 予測を実行中...
        </div>
    `;
    
    try {
        // Get SKUs for the department
        let skusToForecast = app.storeSKUs || [];
        if (department) {
            skusToForecast = skusToForecast.filter(sku => sku.dept === department);
        }
        
        // Limit to top 20 SKUs for quick forecast
        const topSKUs = skusToForecast.slice(0, 20).map(sku => sku.sku);
        
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + parseInt(period));
        
        const response = await fetch('/api/bulk/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                store_id: app.selectedStore,
                skus: topSKUs,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayQuickForecastResults(data);
            app.showNotification('予測が完了しました', 'success');
        } else {
            app.showNotification(data.error || '予測に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('Quick forecast error:', error);
        app.showNotification('予測に失敗しました', 'error');
    }
}

function displayQuickForecastResults(data) {
    let html = `
        <div class="forecast-summary">
            <h4>予測結果サマリー</h4>
            <p>対象店舗: ${data.store_id}</p>
            <p>予測SKU数: ${data.summary.predicted_skus} / ${data.summary.total_skus}</p>
            <p>予測期間: ${data.summary.date_range}</p>
        </div>
        <table class="bulk-results-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>予測需要(合計)</th>
                    <th>信頼度</th>
                    <th>アクション</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    Object.entries(data.predictions).forEach(([sku, predictions]) => {
        if (predictions.length > 0) {
            const totalDemand = predictions.reduce((sum, p) => sum + p.predicted_demand, 0);
            const avgAccuracy = predictions.reduce((sum, p) => sum + (p.model_accuracy || 0), 0) / predictions.length;
            const confidenceClass = avgAccuracy > 0.8 ? 'confidence-high' : avgAccuracy > 0.6 ? 'confidence-medium' : 'confidence-low';
            
            html += `
                <tr>
                    <td>${sku}</td>
                    <td>${totalDemand.toFixed(0)}</td>
                    <td><span class="confidence-indicator ${confidenceClass}">${(avgAccuracy * 100).toFixed(0)}%</span></td>
                    <td><button onclick="adjustPrediction('${sku}')">調整</button></td>
                </tr>
            `;
        }
    });
    
    html += '</tbody></table>';
    document.getElementById('quick-forecast-results').innerHTML = html;
}

function updateSkuSelection() {
    const mode = document.getElementById('sku-selection-mode').value;
    const panel = document.getElementById('sku-selection-panel');
    
    if (!app.storeSKUs || app.storeSKUs.length === 0) {
        panel.innerHTML = '<p>SKUデータがありません。店舗を選択してください。</p>';
        return;
    }
    
    let skusToShow = [];
    
    switch (mode) {
        case 'department':
            // Group by department
            const depts = [...new Set(app.storeSKUs.map(sku => sku.dept).filter(dept => dept))];
            panel.innerHTML = `
                <label for="dept-select">部門を選択:</label>
                <select id="dept-select" onchange="filterSKUsByDepartment()">
                    <option value="">部門を選択</option>
                    ${depts.map(dept => `<option value="${dept}">${dept}</option>`).join('')}
                </select>
                <div id="dept-skus"></div>
            `;
            break;
            
        case 'top-selling':
            // Show top 50 SKUs (mock for demo)
            skusToShow = app.storeSKUs.slice(0, 50);
            displaySKUSelection(skusToShow, panel);
            break;
            
        case 'custom':
            displaySKUSelection(app.storeSKUs, panel);
            break;
            
        default:
            panel.innerHTML = '';
    }
}

function displaySKUSelection(skus, container) {
    let html = '<div class="sku-selection-list">';
    
    skus.forEach(sku => {
        html += `
            <div class="sku-item">
                <input type="checkbox" class="sku-checkbox" value="${sku.sku}" id="sku-${sku.sku}">
                <label for="sku-${sku.sku}" class="sku-info">
                    <div class="sku-code">${sku.sku}</div>
                    <div class="sku-desc">${sku.desc}</div>
                </label>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

async function executeBulkForecast() {
    const selectedSKUs = Array.from(document.querySelectorAll('.sku-checkbox:checked')).map(cb => cb.value);
    
    if (selectedSKUs.length === 0) {
        app.showNotification('SKUを選択してください', 'error');
        return;
    }
    
    if (!app.selectedStore) {
        app.showNotification('店舗を選択してください', 'error');
        return;
    }
    
    document.getElementById('bulk-results').innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> ${selectedSKUs.length}個のSKUを予測中...
        </div>
    `;
    
    try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 14); // 2 weeks
        
        const response = await fetch('/api/bulk/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                store_id: app.selectedStore,
                skus: selectedSKUs,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayBulkResults(data);
            app.showNotification('一括予測が完了しました', 'success');
        } else {
            app.showNotification(data.error || '一括予測に失敗しました', 'error');
        }
        
    } catch (error) {
        console.error('Bulk forecast error:', error);
        app.showNotification('一括予測に失敗しました', 'error');
    }
}

function displayBulkResults(data) {
    let html = `
        <div class="bulk-summary">
            <h4>一括予測結果</h4>
            <p>対象店舗: ${data.store_id}</p>
            <p>予測SKU数: ${data.summary.predicted_skus} / ${data.summary.total_skus}</p>
            <p>予測期間: ${data.summary.date_range}</p>
            <button onclick="exportBulkResults()" class="action-btn">
                <i class="fas fa-download"></i> エクスポート
            </button>
        </div>
        <table class="bulk-results-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>合計予測需要</th>
                    <th>日平均</th>
                    <th>信頼度</th>
                    <th>推奨アクション</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    Object.entries(data.predictions).forEach(([sku, predictions]) => {
        if (predictions.length > 0) {
            const totalDemand = predictions.reduce((sum, p) => sum + p.predicted_demand, 0);
            const avgDemand = totalDemand / predictions.length;
            const avgAccuracy = predictions.reduce((sum, p) => sum + (p.model_accuracy || 0), 0) / predictions.length;
            const confidenceClass = avgAccuracy > 0.8 ? 'confidence-high' : avgAccuracy > 0.6 ? 'confidence-medium' : 'confidence-low';
            
            let recommendation = '通常発注';
            if (avgDemand > 100) recommendation = '在庫増加検討';
            if (avgAccuracy < 0.6) recommendation = '要注意';
            
            html += `
                <tr>
                    <td>${sku}</td>
                    <td>${totalDemand.toFixed(0)}</td>
                    <td>${avgDemand.toFixed(1)}</td>
                    <td><span class="confidence-indicator ${confidenceClass}">${(avgAccuracy * 100).toFixed(0)}%</span></td>
                    <td>${recommendation}</td>
                </tr>
            `;
        }
    });
    
    html += '</tbody></table>';
    document.getElementById('bulk-results').innerHTML = html;
}

// Tab Functions
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all tab buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to clicked button
    const clickedButton = event.target.closest('.tab-button');
    if (clickedButton) {
        clickedButton.classList.add('active');
    }
}

// Data Management Functions
async function uploadCSV() {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    
    if (!file) {
        app.showNotification('Please select a CSV file first', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/data/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('Data uploaded successfully!', 'success');
            document.getElementById('upload-result').innerHTML = `
                <div class="success-message">
                    <h4>Upload Successful!</h4>
                    <p>${data.message}</p>
                    <pre>${JSON.stringify(data.statistics, null, 2)}</pre>
                </div>
            `;
        } else {
            app.showNotification(data.error || 'Upload failed', 'error');
            document.getElementById('upload-result').innerHTML = `
                <div class="error-message">Error: ${data.error}</div>
            `;
        }
    } catch (error) {
        console.error('Upload error:', error);
        app.showNotification('Upload failed', 'error');
        document.getElementById('upload-result').innerHTML = `
            <div class="error-message">Upload failed: ${error.message}</div>
        `;
    }
}

async function loadSampleData() {
    const sampleData = {
        data: [
            {
                date: '2024-01-01T00:00:00Z',
                product_id: 'PROD_001',
                demand_value: 100,
                price: 10.99,
                promotion: false,
                weather_condition: 'sunny',
                seasonality_factor: 1.0
            },
            {
                date: '2024-01-02T00:00:00Z',
                product_id: 'PROD_001',
                demand_value: 120,
                price: 10.99,
                promotion: true,
                weather_condition: 'cloudy',
                seasonality_factor: 1.1
            },
            {
                date: '2024-01-03T00:00:00Z',
                product_id: 'PROD_001',
                demand_value: 95,
                price: 10.99,
                promotion: false,
                weather_condition: 'rainy',
                seasonality_factor: 0.9
            }
        ]
    };

    try {
        const response = await fetch('/api/data/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sampleData)
        });

        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('Sample data loaded successfully!', 'success');
            document.getElementById('upload-result').innerHTML = `
                <div class="success-message">
                    <h4>Sample Data Loaded!</h4>
                    <p>${data.message}</p>
                    <pre>${JSON.stringify(data.statistics, null, 2)}</pre>
                </div>
            `;
        } else {
            app.showNotification(data.error || 'Failed to load sample data', 'error');
        }
    } catch (error) {
        console.error('Sample data error:', error);
        app.showNotification('Failed to load sample data', 'error');
    }
}

async function loadDataStatistics() {
    try {
        const response = await fetch('/api/data/statistics');
        const data = await response.json();
        
        if (response.ok && data.total_records) {
            document.getElementById('data-statistics').innerHTML = `
                <div class="statistics-display">
                    <h4>Data Statistics</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">Total Records:</span>
                            <span class="stat-value">${data.total_records}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Unique Products:</span>
                            <span class="stat-value">${data.unique_products}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Date Range:</span>
                            <span class="stat-value">${data.date_range.start} to ${data.date_range.end}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Average Demand:</span>
                            <span class="stat-value">${data.demand_stats.mean.toFixed(2)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Min Demand:</span>
                            <span class="stat-value">${data.demand_stats.min}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Max Demand:</span>
                            <span class="stat-value">${data.demand_stats.max}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('data-statistics').innerHTML = `
                <div class="info-message">No data available. Please upload data first.</div>
            `;
        }
    } catch (error) {
        console.error('Statistics error:', error);
        document.getElementById('data-statistics').innerHTML = `
            <div class="error-message">Failed to load statistics: ${error.message}</div>
        `;
    }
}

// Model Training Functions
async function trainModel() {
    document.getElementById('training-result').innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> Training model... This may take a few moments.
        </div>
    `;

    try {
        const response = await fetch('/api/model/train', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            app.showNotification('Model trained successfully!', 'success');
            document.getElementById('training-result').innerHTML = `
                <div class="success-message">
                    <h4>Training Successful!</h4>
                    <div class="training-metrics">
                        <p><strong>Active Model:</strong> ${data.active_model}</p>
                        <p><strong>Training Samples:</strong> ${data.training_samples}</p>
                        <p><strong>Test Samples:</strong> ${data.test_samples}</p>
                        <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
                    </div>
                </div>
            `;
            
            // Refresh system status
            app.loadSystemStatus();
        } else {
            app.showNotification(data.error || 'Training failed', 'error');
            document.getElementById('training-result').innerHTML = `
                <div class="error-message">Training failed: ${data.error}</div>
            `;
        }
    } catch (error) {
        console.error('Training error:', error);
        app.showNotification('Training failed', 'error');
        document.getElementById('training-result').innerHTML = `
            <div class="error-message">Training failed: ${error.message}</div>
        `;
    }
}

async function loadModelInfo() {
    try {
        const response = await fetch('/api/info');
        const data = await response.json();
        
        if (response.ok) {
            const modelInfo = data.model_info;
            document.getElementById('model-info').innerHTML = `
                <div class="model-info-display">
                    <h4>Model Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Status:</span>
                            <span class="info-value">${modelInfo.is_trained ? 'Trained' : 'Not Trained'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Active Model:</span>
                            <span class="info-value">${modelInfo.active_model || 'None'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Available Models:</span>
                            <span class="info-value">${modelInfo.available_models ? modelInfo.available_models.join(', ') : 'None'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Feature Columns:</span>
                            <span class="info-value">${modelInfo.feature_columns ? modelInfo.feature_columns.length : 0}</span>
                        </div>
                    </div>
                    ${modelInfo.metrics ? `<pre>${JSON.stringify(modelInfo.metrics, null, 2)}</pre>` : ''}
                </div>
            `;
        }
    } catch (error) {
        console.error('Model info error:', error);
        document.getElementById('model-info').innerHTML = `
            <div class="error-message">Failed to load model info: ${error.message}</div>
        `;
    }
}

// Prediction Functions
async function makePrediction() {
    const productId = document.getElementById('product-id').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!productId || !startDate || !endDate) {
        app.showNotification('Please fill in all required fields', 'error');
        return;
    }

    document.getElementById('prediction-result').innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> Making predictions...
        </div>
    `;

    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                start_date: startDate + 'T00:00:00Z',
                end_date: endDate + 'T23:59:59Z',
                include_confidence_interval: true
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            app.showNotification('Predictions generated successfully!', 'success');
            
            let predictionsHTML = `
                <div class="success-message">
                    <h4>Prediction Results</h4>
                    <p><strong>Product:</strong> ${data.request.product_id}</p>
                    <p><strong>Period:</strong> ${data.request.start_date.split('T')[0]} to ${data.request.end_date.split('T')[0]}</p>
                    <div class="predictions-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Predicted Demand</th>
                                    <th>Confidence Range</th>
                                    <th>Model Accuracy</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            data.predictions.forEach(pred => {
                predictionsHTML += `
                    <tr>
                        <td>${pred.prediction_date.split('T')[0]}</td>
                        <td>${pred.predicted_demand.toFixed(2)}</td>
                        <td>${pred.confidence_lower?.toFixed(2)} - ${pred.confidence_upper?.toFixed(2)}</td>
                        <td>${pred.model_accuracy ? (pred.model_accuracy * 100).toFixed(1) + '%' : 'N/A'}</td>
                    </tr>
                `;
            });
            
            predictionsHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('prediction-result').innerHTML = predictionsHTML;
        } else {
            app.showNotification(data.error || 'Prediction failed', 'error');
            document.getElementById('prediction-result').innerHTML = `
                <div class="error-message">Prediction failed: ${data.error}</div>
            `;
        }
    } catch (error) {
        console.error('Prediction error:', error);
        app.showNotification('Prediction failed', 'error');
        document.getElementById('prediction-result').innerHTML = `
            <div class="error-message">Prediction failed: ${error.message}</div>
        `;
    }
}

// Visualization Functions
async function showChart(chartType) {
    document.getElementById('chart-container').innerHTML = `
        <div class="loading-message">
            <i class="fas fa-spinner fa-spin"></i> Generating ${chartType.replace('_', ' ')} chart...
        </div>
    `;

    try {
        const response = await fetch(`/api/visualize/${chartType}`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            app.showNotification('Chart generated successfully!', 'success');
            
            // Create a new div for the plot
            const plotDiv = document.createElement('div');
            plotDiv.id = 'plotly-chart';
            plotDiv.style.width = '100%';
            plotDiv.style.height = '500px';
            
            document.getElementById('chart-container').innerHTML = '';
            document.getElementById('chart-container').appendChild(plotDiv);
            
            // Render the Plotly chart
            Plotly.newPlot('plotly-chart', data.chart.data, data.chart.layout, {responsive: true});
        } else {
            app.showNotification(data.error || 'Chart generation failed', 'error');
            document.getElementById('chart-container').innerHTML = `
                <div class="error-message">Chart generation failed: ${data.error}</div>
            `;
        }
    } catch (error) {
        console.error('Chart error:', error);
        app.showNotification('Chart generation failed', 'error');
        document.getElementById('chart-container').innerHTML = `
            <div class="error-message">Chart generation failed: ${error.message}</div>
        `;
    }
}

async function loadRetailSampleData() {
    const sampleData = {
        data: [
            {
                sales_date: '2024-01-01T00:00:00Z',
                store: 'STORE_001',
                sku: 'SKU_001',
                desc: '商品A - プレミアム商品',
                div: 'DIV_FOOD',
                div_desc: '食品事業部',
                dept: 'DEPT_SNACK',
                dept_desc: 'スナック部門',
                sold_qty: 150,
                act_sales: 1500.0,
                price: 10.0,
                promotion: false,
                promotion_discount: 0.0,
                weather_condition: 'sunny',
                seasonality_factor: 1.0
            },
            {
                sales_date: '2024-01-02T00:00:00Z',
                store: 'STORE_001',
                sku: 'SKU_001',
                desc: '商品A - プレミアム商品',
                div: 'DIV_FOOD',
                div_desc: '食品事業部',
                dept: 'DEPT_SNACK',
                dept_desc: 'スナック部門',
                sold_qty: 180,
                act_sales: 1620.0,
                price: 9.0,
                promotion: true,
                promotion_discount: 0.1,
                weather_condition: 'cloudy',
                seasonality_factor: 1.1
            },
            {
                sales_date: '2024-01-03T00:00:00Z',
                store: 'STORE_001',
                sku: 'SKU_002',
                desc: '商品B - スタンダード商品',
                div: 'DIV_BEVERAGE',
                div_desc: '飲料事業部',
                dept: 'DEPT_SOFT_DRINK',
                dept_desc: 'ソフトドリンク部門',
                sold_qty: 95,
                act_sales: 950.0,
                price: 10.0,
                promotion: false,
                promotion_discount: 0.0,
                weather_condition: 'rainy',
                seasonality_factor: 0.9
            },
            {
                sales_date: '2024-01-01T00:00:00Z',
                store: 'STORE_002',
                sku: 'SKU_001',
                desc: '商品A - プレミアム商品',
                div: 'DIV_FOOD',
                div_desc: '食品事業部',
                dept: 'DEPT_SNACK',
                dept_desc: 'スナック部門',
                sold_qty: 120,
                act_sales: 1200.0,
                price: 10.0,
                promotion: false,
                promotion_discount: 0.0,
                weather_condition: 'sunny',
                seasonality_factor: 1.0
            },
            {
                sales_date: '2024-01-02T00:00:00Z',
                store: 'STORE_002',
                sku: 'SKU_002',
                desc: '商品B - スタンダード商品',
                div: 'DIV_BEVERAGE',
                div_desc: '飲料事業部',
                dept: 'DEPT_SOFT_DRINK',
                dept_desc: 'ソフトドリンク部門',
                sold_qty: 200,
                act_sales: 1800.0,
                price: 9.0,
                promotion: true,
                promotion_discount: 0.1,
                weather_condition: 'cloudy',
                seasonality_factor: 1.1
            }
        ]
    };

    try {
        const response = await fetch('/api/data/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sampleData)
        });

        const data = await response.json();
        
        if (response.ok) {
            app.showNotification('小売サンプルデータが読み込まれました！', 'success');
            document.getElementById('upload-result').innerHTML = `
                <div class="success-message">
                    <h4>小売サンプルデータ読み込み完了!</h4>
                    <p>${data.message}</p>
                    <div class="enhanced-stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-store"></i></div>
                            <div class="stat-number">${data.statistics.unique_stores || 0}</div>
                            <div class="stat-description">店舗数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-boxes"></i></div>
                            <div class="stat-number">${data.statistics.unique_skus || 0}</div>
                            <div class="stat-description">SKU数</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-yen-sign"></i></div>
                            <div class="stat-number">¥${(data.statistics.sales_stats.total_sales || 0).toLocaleString()}</div>
                            <div class="stat-description">総売上</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-tags"></i></div>
                            <div class="stat-number">${data.statistics.promotion_stats.total_promotion_days || 0}</div>
                            <div class="stat-description">プロモーション日数</div>
                        </div>
                    </div>
                </div>
            `;
            
            // Load stores after successful data upload
            app.loadStores();
        } else {
            app.showNotification(data.error || 'サンプルデータの読み込みに失敗しました', 'error');
        }
    } catch (error) {
        console.error('Sample data error:', error);
        app.showNotification('サンプルデータの読み込みに失敗しました', 'error');
    }
}

// Global app instance
let app;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new StoreDemandPredictionApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (app) {
        app.showNotification('予期しないエラーが発生しました。', 'error');
    }
});