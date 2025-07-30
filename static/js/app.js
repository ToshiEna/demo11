// Demand Prediction System JavaScript

class DemandPredictionApp {
    constructor() {
        this.currentTab = 'data-management';
        this.init();
    }

    async init() {
        console.log('Demand Prediction System starting...');
        
        // Initialize components
        this.initEventListeners();
        await this.loadSystemStatus();
        
        // Set default dates
        this.setDefaultDates();
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
            
            const statusElement = document.getElementById('system-status');
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
            const statusElement = document.getElementById('system-status');
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

// Global app instance
let app;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new DemandPredictionApp();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (app) {
        app.showNotification('An unexpected error occurred.', 'error');
    }
});