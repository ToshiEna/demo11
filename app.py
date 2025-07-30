"""
Demand Prediction Web Application
AI-powered demand forecasting system with Azure integration
"""
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import os
import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import pandas as pd
import numpy as np
import io
import base64

# Data science libraries
try:
    import matplotlib
    matplotlib.use('Agg')  # Use non-interactive backend
    import matplotlib.pyplot as plt
    import seaborn as sns
    import plotly.graph_objects as go
    import plotly.express as px
    from plotly.utils import PlotlyJSONEncoder
    DATA_SCIENCE_AVAILABLE = True
except ImportError:
    DATA_SCIENCE_AVAILABLE = False

# Demand prediction models
try:
    from models import DemandData, PredictionRequest, PredictionResult, DemandDataProcessor
    from models.predictor import DemandPredictor
    PREDICTION_MODELS_AVAILABLE = True
except ImportError:
    PREDICTION_MODELS_AVAILABLE = False

# Azure OpenAI integration (optional)
try:
    import openai
    from openai import AzureOpenAI
    AZURE_OPENAI_AVAILABLE = True
except ImportError:
    AZURE_OPENAI_AVAILABLE = False

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
class Config:
    def __init__(self):
        self.debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
        self.port = int(os.getenv('PORT', 5000))
        self.host = os.getenv('HOST', '0.0.0.0')
        
        # Azure OpenAI configuration
        self.azure_openai_endpoint = os.getenv('AZURE_OPENAI_ENDPOINT')
        self.azure_openai_key = os.getenv('AZURE_OPENAI_KEY')
        self.azure_openai_version = os.getenv('AZURE_OPENAI_VERSION', '2024-02-15-preview')
        self.azure_openai_deployment = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-35-turbo')
        
        # Data storage
        self.data_dir = os.path.join(os.path.dirname(__file__), 'data')
        self.models_dir = os.path.join(os.path.dirname(__file__), 'saved_models')
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)

config = Config()

# Initialize global objects
data_processor = DemandDataProcessor() if PREDICTION_MODELS_AVAILABLE else None
predictor = DemandPredictor() if PREDICTION_MODELS_AVAILABLE else None

# Azure OpenAI client
azure_openai_client = None
if AZURE_OPENAI_AVAILABLE and config.azure_openai_endpoint and config.azure_openai_key:
    try:
        azure_openai_client = AzureOpenAI(
            azure_endpoint=config.azure_openai_endpoint,
            api_key=config.azure_openai_key,
            api_version=config.azure_openai_version
        )
        logger.info("Azure OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Azure OpenAI client: {e}")

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'azure_openai_available': azure_openai_client is not None,
        'data_science_available': DATA_SCIENCE_AVAILABLE,
        'prediction_models_available': PREDICTION_MODELS_AVAILABLE,
        'model_trained': predictor.is_trained if predictor else False
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """Chat endpoint using Azure OpenAI"""
    if not azure_openai_client:
        return jsonify({
            'error': 'Azure OpenAI not configured',
            'message': 'Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY environment variables'
        }), 503
    
    try:
        data = request.json
        message = data.get('message', '')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Call Azure OpenAI
        response = azure_openai_client.chat.completions.create(
            model=config.azure_openai_deployment,
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        reply = response.choices[0].message.content
        
        return jsonify({
            'reply': reply,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return jsonify({
            'error': 'Failed to process chat request',
            'message': str(e)
        }), 500

@app.route('/api/info')
def info():
    """System information endpoint"""
    return jsonify({
        'app_name': 'Demand Prediction System',
        'version': '2.0.0',
        'description': 'AI-powered demand forecasting and analytics platform',
        'environment': 'local' if config.debug else 'production',
        'features': {
            'demand_prediction': PREDICTION_MODELS_AVAILABLE,
            'data_visualization': DATA_SCIENCE_AVAILABLE,
            'azure_openai': azure_openai_client is not None,
            'cors_enabled': True,
            'file_upload': True,
            'model_training': True
        },
        'model_info': predictor.get_model_info() if predictor else {}
    })

# Demand Prediction Endpoints

@app.route('/api/data/upload', methods=['POST'])
def upload_data():
    """Upload demand data"""
    if not PREDICTION_MODELS_AVAILABLE:
        return jsonify({'error': 'Prediction models not available'}), 503
    
    try:
        if 'file' not in request.files:
            # Handle JSON data
            data = request.json
            if not data or 'data' not in data:
                return jsonify({'error': 'No data provided'}), 400
            
            demand_data = []
            for item in data['data']:
                demand_data.append(DemandData(
                    date=datetime.fromisoformat(item['date'].replace('Z', '+00:00')),
                    product_id=item['product_id'],
                    demand_value=float(item['demand_value']),
                    price=item.get('price'),
                    promotion=item.get('promotion'),
                    weather_condition=item.get('weather_condition'),
                    seasonality_factor=item.get('seasonality_factor')
                ))
        else:
            # Handle file upload
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Read CSV file
            df = pd.read_csv(file)
            required_cols = ['date', 'product_id', 'demand_value']
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                return jsonify({'error': f'Missing required columns: {missing_cols}'}), 400
            
            demand_data = []
            for _, row in df.iterrows():
                demand_data.append(DemandData(
                    date=pd.to_datetime(row['date']),
                    product_id=str(row['product_id']),
                    demand_value=float(row['demand_value']),
                    price=row.get('price'),
                    promotion=row.get('promotion'),
                    weather_condition=row.get('weather_condition'),
                    seasonality_factor=row.get('seasonality_factor')
                ))
        
        # Load data into processor
        success = data_processor.load_data(demand_data)
        if not success:
            return jsonify({'error': 'Failed to load data'}), 500
        
        # Preprocess data
        processed_data = data_processor.preprocess_data()
        stats = data_processor.get_statistics()
        
        return jsonify({
            'success': True,
            'message': f'Successfully loaded {len(demand_data)} records',
            'statistics': stats
        })
        
    except Exception as e:
        logger.error(f"Data upload error: {e}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@app.route('/api/data/statistics')
def get_data_statistics():
    """Get data statistics"""
    if not PREDICTION_MODELS_AVAILABLE or data_processor is None:
        return jsonify({'error': 'Data processor not available'}), 503
    
    stats = data_processor.get_statistics()
    return jsonify(stats)

@app.route('/api/model/train', methods=['POST'])
def train_model():
    """Train prediction model"""
    if not PREDICTION_MODELS_AVAILABLE or predictor is None or data_processor is None:
        return jsonify({'error': 'Prediction system not available'}), 503
    
    try:
        if data_processor.data.empty:
            return jsonify({'error': 'No data available for training'}), 400
        
        result = predictor.train(data_processor.data)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Save trained model
        model_path = os.path.join(config.models_dir, 'demand_predictor.joblib')
        predictor.save_model(model_path)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Model training error: {e}")
        return jsonify({'error': f'Training failed: {str(e)}'}), 500

@app.route('/api/predict', methods=['POST'])
def predict_demand():
    """Make demand predictions"""
    if not PREDICTION_MODELS_AVAILABLE or predictor is None or data_processor is None:
        return jsonify({'error': 'Prediction system not available'}), 503
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No prediction request data'}), 400
        
        # Parse prediction request
        pred_request = PredictionRequest(
            product_id=data['product_id'],
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')),
            include_confidence_interval=data.get('include_confidence_interval', True),
            additional_features=data.get('additional_features')
        )
        
        # Make predictions
        results = predictor.predict(pred_request, data_processor.data)
        
        # Convert results to JSON
        predictions = []
        for result in results:
            predictions.append({
                'product_id': result.product_id,
                'prediction_date': result.prediction_date.isoformat(),
                'predicted_demand': result.predicted_demand,
                'confidence_lower': result.confidence_lower,
                'confidence_upper': result.confidence_upper,
                'model_accuracy': result.model_accuracy
            })
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'request': {
                'product_id': pred_request.product_id,
                'start_date': pred_request.start_date.isoformat(),
                'end_date': pred_request.end_date.isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/api/visualize/<chart_type>')
def visualize_data(chart_type):
    """Generate data visualizations"""
    if not DATA_SCIENCE_AVAILABLE or not PREDICTION_MODELS_AVAILABLE:
        return jsonify({'error': 'Visualization not available'}), 503
    
    try:
        if data_processor is None or data_processor.data.empty:
            return jsonify({'error': 'No data available for visualization'}), 400
        
        data = data_processor.data
        
        if chart_type == 'demand_over_time':
            # Time series plot
            fig = px.line(data, x='date', y='demand_value', color='product_id',
                         title='Demand Over Time')
            
        elif chart_type == 'demand_distribution':
            # Distribution plot
            fig = px.histogram(data, x='demand_value', nbins=30,
                              title='Demand Distribution')
            
        elif chart_type == 'product_comparison':
            # Product comparison
            product_stats = data.groupby('product_id')['demand_value'].agg(['mean', 'std']).reset_index()
            fig = px.bar(product_stats, x='product_id', y='mean',
                        error_y='std', title='Average Demand by Product')
            
        elif chart_type == 'seasonal_pattern':
            # Seasonal pattern
            data['month'] = data['date'].dt.month
            monthly_avg = data.groupby('month')['demand_value'].mean().reset_index()
            fig = px.line(monthly_avg, x='month', y='demand_value',
                         title='Seasonal Demand Pattern')
            
        else:
            return jsonify({'error': 'Unknown chart type'}), 400
        
        # Convert to JSON
        graphJSON = json.dumps(fig, cls=PlotlyJSONEncoder)
        
        return jsonify({
            'success': True,
            'chart': json.loads(graphJSON)
        })
        
    except Exception as e:
        logger.error(f"Visualization error: {e}")
        return jsonify({'error': f'Visualization failed: {str(e)}'}), 500

@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500

if __name__ == '__main__':
    logger.info(f"Starting Flask application on {config.host}:{config.port}")
    logger.info(f"Debug mode: {config.debug}")
    logger.info(f"Azure OpenAI available: {azure_openai_client is not None}")
    
    app.run(
        host=config.host,
        port=config.port,
        debug=config.debug
    )