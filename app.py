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
                # Handle both old and new format
                if 'sales_date' in item:  # New retail format
                    demand_data.append(DemandData(
                        sales_date=datetime.fromisoformat(item['sales_date'].replace('Z', '+00:00')),
                        store=item['store'],
                        sku=item['sku'],
                        desc=item.get('desc', ''),
                        div=item.get('div', ''),
                        div_desc=item.get('div_desc', ''),
                        dept=item.get('dept', ''),
                        dept_desc=item.get('dept_desc', ''),
                        sold_qty=float(item['sold_qty']),
                        act_sales=float(item['act_sales']),
                        price=item.get('price'),
                        promotion=item.get('promotion'),
                        promotion_discount=item.get('promotion_discount'),
                        weather_condition=item.get('weather_condition'),
                        seasonality_factor=item.get('seasonality_factor')
                    ))
                else:  # Legacy format
                    demand_data.append(DemandData(
                        sales_date=datetime.fromisoformat(item['date'].replace('Z', '+00:00')),
                        store=item.get('store', 'STORE_001'),
                        sku=item['product_id'],
                        desc=item.get('desc', ''),
                        div=item.get('div', 'DIV_001'),
                        div_desc=item.get('div_desc', ''),
                        dept=item.get('dept', 'DEPT_001'),
                        dept_desc=item.get('dept_desc', ''),
                        sold_qty=float(item['demand_value']),
                        act_sales=float(item.get('act_sales', item['demand_value'] * item.get('price', 10.0))),
                        price=item.get('price'),
                        promotion=item.get('promotion'),
                        promotion_discount=item.get('promotion_discount'),
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
            
            # Check for new retail format
            retail_cols = ['SALES DATE', 'STORE', 'SKU', 'SOLD QTY', 'ACT SALES']
            has_retail_format = all(col in df.columns for col in retail_cols)
            
            if has_retail_format:
                # New retail format
                required_cols = ['SALES DATE', 'STORE', 'SKU', 'SOLD QTY', 'ACT SALES']
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    return jsonify({'error': f'Missing required columns: {missing_cols}'}), 400
                
                demand_data = []
                for _, row in df.iterrows():
                    demand_data.append(DemandData(
                        sales_date=pd.to_datetime(row['SALES DATE']),
                        store=str(row['STORE']),
                        sku=str(row['SKU']),
                        desc=str(row.get('DESC', '')),
                        div=str(row.get('DIV', '')),
                        div_desc=str(row.get('DIV DESC', '')),
                        dept=str(row.get('DEPT', '')),
                        dept_desc=str(row.get('DEPT DESC', '')),
                        sold_qty=float(row['SOLD QTY']),
                        act_sales=float(row['ACT SALES']),
                        price=row.get('price') or (row['ACT SALES'] / max(row['SOLD QTY'], 1)),
                        promotion=row.get('promotion', False),
                        promotion_discount=row.get('promotion_discount', 0.0),
                        weather_condition=row.get('weather_condition'),
                        seasonality_factor=row.get('seasonality_factor')
                    ))
            else:
                # Legacy format
                required_cols = ['date', 'product_id', 'demand_value']
                missing_cols = [col for col in required_cols if col not in df.columns]
                if missing_cols:
                    return jsonify({'error': f'Missing required columns: {missing_cols}'}), 400
                
                demand_data = []
                for _, row in df.iterrows():
                    demand_data.append(DemandData(
                        sales_date=pd.to_datetime(row['date']),
                        store=str(row.get('store', 'STORE_001')),
                        sku=str(row['product_id']),
                        desc=str(row.get('desc', '')),
                        div=str(row.get('div', 'DIV_001')),
                        div_desc=str(row.get('div_desc', '')),
                        dept=str(row.get('dept', 'DEPT_001')),
                        dept_desc=str(row.get('dept_desc', '')),
                        sold_qty=float(row['demand_value']),
                        act_sales=float(row.get('act_sales', row['demand_value'] * row.get('price', 10.0))),
                        price=row.get('price'),
                        promotion=row.get('promotion'),
                        promotion_discount=row.get('promotion_discount'),
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

@app.route('/api/stores')
def get_stores():
    """Get list of stores"""
    if not PREDICTION_MODELS_AVAILABLE or data_processor is None:
        return jsonify({'error': 'Data processor not available'}), 503
    
    if data_processor.data.empty:
        return jsonify({'stores': []})
    
    stores = data_processor.data['store'].unique().tolist() if 'store' in data_processor.data.columns else []
    return jsonify({'stores': stores})

@app.route('/api/stores/<store_id>/skus')
def get_store_skus(store_id):
    """Get SKUs for a specific store"""
    if not PREDICTION_MODELS_AVAILABLE or data_processor is None:
        return jsonify({'error': 'Data processor not available'}), 503
    
    if data_processor.data.empty:
        return jsonify({'skus': []})
    
    store_data = data_processor.data[data_processor.data['store'] == store_id] if 'store' in data_processor.data.columns else data_processor.data
    skus = store_data[['sku', 'desc', 'div', 'div_desc', 'dept', 'dept_desc']].drop_duplicates().to_dict('records') if 'sku' in store_data.columns else []
    
    return jsonify({'skus': skus})

@app.route('/api/stores/<store_id>/dashboard')
def get_store_dashboard(store_id):
    """Get dashboard data for a specific store"""
    if not PREDICTION_MODELS_AVAILABLE or data_processor is None:
        return jsonify({'error': 'Data processor not available'}), 503
    
    if data_processor.data.empty:
        return jsonify({'error': 'No data available'}), 400
    
    try:
        store_data = data_processor.data[data_processor.data['store'] == store_id] if 'store' in data_processor.data.columns else data_processor.data
        
        if store_data.empty:
            return jsonify({'error': f'No data found for store {store_id}'}), 404
        
        # Calculate dashboard metrics
        today = datetime.now().date()
        last_30_days = today - timedelta(days=30)
        
        recent_data = store_data[store_data['sales_date'].dt.date >= last_30_days] if 'sales_date' in store_data.columns else store_data
        
        dashboard = {
            'store_id': store_id,
            'total_skus': store_data['sku'].nunique() if 'sku' in store_data.columns else store_data['product_id'].nunique(),
            'total_sales_30d': float(recent_data['act_sales'].sum()) if 'act_sales' in recent_data.columns and not recent_data['act_sales'].isna().all() else 0.0,
            'total_qty_30d': float(recent_data['sold_qty'].sum()) if 'sold_qty' in recent_data.columns and not recent_data['sold_qty'].isna().all() else float(recent_data['demand_value'].sum()) if 'demand_value' in recent_data.columns else 0.0,
            'avg_daily_sales': float(recent_data.groupby(recent_data['sales_date'].dt.date)['act_sales'].sum().mean()) if 'act_sales' in recent_data.columns and not recent_data['act_sales'].isna().all() else 0.0,
            'promotion_days': int(recent_data['promotion'].sum()) if 'promotion' in recent_data.columns and not recent_data['promotion'].isna().all() else 0,
            'top_selling_skus': store_data.groupby('sku')['sold_qty'].sum().nlargest(10).to_dict() if 'sku' in store_data.columns else {},
            'departments': store_data['dept'].value_counts().to_dict() if 'dept' in store_data.columns else {},
            'divisions': store_data['div'].value_counts().to_dict() if 'div' in store_data.columns else {}
        }
        
        return jsonify(dashboard)
        
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return jsonify({'error': f'Dashboard generation failed: {str(e)}'}), 500

@app.route('/api/promotions', methods=['GET'])
def get_promotions():
    """Get promotion data"""
    if not PREDICTION_MODELS_AVAILABLE or data_processor is None:
        return jsonify({'error': 'Data processor not available'}), 503
    
    if data_processor.data.empty:
        return jsonify({'promotions': []})
    
    # Get promotion data
    promo_data = data_processor.data[data_processor.data['promotion'] == True] if 'promotion' in data_processor.data.columns else pd.DataFrame()
    
    if promo_data.empty:
        return jsonify({'promotions': []})
    
    promotions = []
    for _, row in promo_data.iterrows():
        promotions.append({
            'date': row['sales_date'].isoformat() if 'sales_date' in row else row['date'].isoformat(),
            'store': row.get('store', ''),
            'sku': row.get('sku', row.get('product_id', '')),
            'desc': row.get('desc', ''),
            'discount': row.get('promotion_discount', 0),
            'sales_impact': row.get('act_sales', 0),
            'qty_impact': row.get('sold_qty', row.get('demand_value', 0))
        })
    
    return jsonify({'promotions': promotions})

@app.route('/api/bulk/predict', methods=['POST'])
def bulk_predict():
    """Bulk prediction for multiple SKUs"""
    if not PREDICTION_MODELS_AVAILABLE or predictor is None or data_processor is None:
        return jsonify({'error': 'Prediction system not available'}), 503
    
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No prediction request data'}), 400
        
        store_id = data.get('store_id')
        skus = data.get('skus', [])
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        
        if not store_id or not skus:
            return jsonify({'error': 'store_id and skus are required'}), 400
        
        results = {}
        
        for sku in skus:
            # Create prediction request for this SKU
            pred_request = PredictionRequest(
                product_id=sku,
                start_date=start_date,
                end_date=end_date,
                include_confidence_interval=True,
                additional_features={'store_id': store_id}
            )
            
            # Filter data for this store and SKU
            store_sku_data = data_processor.data[
                (data_processor.data['store'] == store_id) & 
                (data_processor.data['sku'] == sku)
            ] if 'store' in data_processor.data.columns else data_processor.data[data_processor.data['product_id'] == sku]
            
            if not store_sku_data.empty:
                predictions = predictor.predict(pred_request, store_sku_data)
                
                results[sku] = []
                for pred in predictions:
                    results[sku].append({
                        'prediction_date': pred.prediction_date.isoformat(),
                        'predicted_demand': pred.predicted_demand,
                        'confidence_lower': pred.confidence_lower,
                        'confidence_upper': pred.confidence_upper,
                        'model_accuracy': pred.model_accuracy
                    })
        
        return jsonify({
            'success': True,
            'store_id': store_id,
            'predictions': results,
            'summary': {
                'total_skus': len(skus),
                'predicted_skus': len([k for k, v in results.items() if v]),
                'date_range': f"{start_date.date()} to {end_date.date()}"
            }
        })
        
    except Exception as e:
        logger.error(f"Bulk prediction error: {e}")
        return jsonify({'error': f'Bulk prediction failed: {str(e)}'}), 500
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