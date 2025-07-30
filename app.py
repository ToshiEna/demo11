"""
Flask Web Application
Azure-ready web application with local development support
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime

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

config = Config()

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
        'azure_openai_available': azure_openai_client is not None
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
        'app_name': 'Demo11 Application',
        'version': '1.0.0',
        'environment': 'local' if config.debug else 'production',
        'features': {
            'azure_openai': azure_openai_client is not None,
            'cors_enabled': True
        }
    })

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