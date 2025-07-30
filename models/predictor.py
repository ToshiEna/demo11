"""
Demand Prediction Engine
Machine learning models for demand forecasting
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import joblib
import os

from models import PredictionRequest, PredictionResult, DemandDataProcessor


class DemandPredictor:
    """Main prediction engine for demand forecasting"""
    
    def __init__(self):
        self.models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'linear_regression': LinearRegression()
        }
        self.active_model = 'random_forest'
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.feature_columns = []
        self.model_metrics = {}
        
    def prepare_features(self, data: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for training or prediction"""
        if data.empty:
            return data
        
        # Select and prepare feature columns
        feature_data = data.copy()
        
        # Encode categorical variables
        categorical_cols = ['product_id', 'weather_condition']
        for col in categorical_cols:
            if col in feature_data.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    feature_data[col] = self.label_encoders[col].fit_transform(feature_data[col].astype(str))
                else:
                    # Handle unseen categories
                    feature_data[col] = feature_data[col].astype(str)
                    known_categories = set(self.label_encoders[col].classes_)
                    feature_data[col] = feature_data[col].apply(
                        lambda x: x if x in known_categories else 'unknown'
                    )
                    # Add 'unknown' to encoder if not present
                    if 'unknown' not in known_categories:
                        self.label_encoders[col].classes_ = np.append(
                            self.label_encoders[col].classes_, 'unknown'
                        )
                    feature_data[col] = self.label_encoders[col].transform(feature_data[col])
        
        # Select numerical features
        feature_cols = [
            'year', 'month', 'day_of_week', 'quarter',
            'price', 'promotion', 'seasonality_factor',
            'product_id'
        ]
        
        # Add lag features if available
        lag_cols = [col for col in feature_data.columns if col.startswith('demand_lag_')]
        feature_cols.extend(lag_cols)
        
        # Add weather condition if available
        if 'weather_condition' in feature_data.columns:
            feature_cols.append('weather_condition')
        
        # Filter columns that exist in the data
        available_cols = [col for col in feature_cols if col in feature_data.columns]
        feature_data = feature_data[available_cols]
        
        # Fill missing values
        feature_data = feature_data.fillna(0)
        
        self.feature_columns = available_cols
        return feature_data
    
    def train(self, data: pd.DataFrame) -> Dict[str, Any]:
        """Train the prediction models"""
        if data.empty or 'demand_value' not in data.columns:
            return {'error': 'Invalid training data'}
        
        try:
            # Prepare features
            X = self.prepare_features(data)
            y = data['demand_value']
            
            # Remove rows with NaN in target variable
            valid_indices = ~y.isna()
            X = X[valid_indices]
            y = y[valid_indices]
            
            if len(X) < 10:  # Need minimum data for training
                return {'error': 'Insufficient data for training (minimum 10 records required)'}
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train all models and evaluate
            results = {}
            for model_name, model in self.models.items():
                # Train model
                if model_name == 'linear_regression':
                    model.fit(X_train_scaled, y_train)
                    y_pred = model.predict(X_test_scaled)
                else:
                    model.fit(X_train, y_train)
                    y_pred = model.predict(X_test)
                
                # Calculate metrics
                mae = mean_absolute_error(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)
                
                results[model_name] = {
                    'mae': mae,
                    'mse': mse,
                    'rmse': np.sqrt(mse),
                    'r2': r2
                }
            
            # Select best model based on R2 score
            best_model = max(results.keys(), key=lambda k: results[k]['r2'])
            self.active_model = best_model
            self.model_metrics = results
            self.is_trained = True
            
            return {
                'success': True,
                'models_trained': len(self.models),
                'active_model': self.active_model,
                'metrics': results,
                'training_samples': len(X_train),
                'test_samples': len(X_test)
            }
            
        except Exception as e:
            return {'error': f'Training failed: {str(e)}'}
    
    def predict(self, request: PredictionRequest, data: pd.DataFrame) -> List[PredictionResult]:
        """Make demand predictions"""
        if not self.is_trained:
            return []
        
        try:
            # Filter data for the specific product
            product_data = data[data['product_id'] == request.product_id].copy()
            
            if product_data.empty:
                return []
            
            # Generate prediction dates
            prediction_dates = pd.date_range(
                start=request.start_date,
                end=request.end_date,
                freq='D'
            )
            
            results = []
            for pred_date in prediction_dates:
                # Create feature row for prediction
                # Use the most recent data for feature engineering
                latest_data = product_data.iloc[-1:].copy()
                latest_data['date'] = pred_date
                latest_data['year'] = pred_date.year
                latest_data['month'] = pred_date.month
                latest_data['day_of_week'] = pred_date.dayofweek
                latest_data['quarter'] = pred_date.quarter
                
                # Prepare features
                X_pred = self.prepare_features(latest_data)
                
                # Make prediction
                model = self.models[self.active_model]
                
                if self.active_model == 'linear_regression':
                    X_pred_scaled = self.scaler.transform(X_pred)
                    prediction = model.predict(X_pred_scaled)[0]
                else:
                    prediction = model.predict(X_pred)[0]
                
                # Calculate confidence interval (simple approach)
                confidence_interval = 0.1 * prediction  # 10% of predicted value
                
                result = PredictionResult(
                    product_id=request.product_id,
                    prediction_date=pred_date,
                    predicted_demand=max(0, prediction),  # Ensure non-negative
                    confidence_lower=max(0, prediction - confidence_interval),
                    confidence_upper=prediction + confidence_interval,
                    model_accuracy=self.model_metrics.get(self.active_model, {}).get('r2')
                )
                
                results.append(result)
            
            return results
            
        except Exception as e:
            print(f"Prediction error: {e}")
            return []
    
    def save_model(self, filepath: str) -> bool:
        """Save trained model to file"""
        try:
            model_data = {
                'models': self.models,
                'active_model': self.active_model,
                'scaler': self.scaler,
                'label_encoders': self.label_encoders,
                'is_trained': self.is_trained,
                'feature_columns': self.feature_columns,
                'model_metrics': self.model_metrics
            }
            joblib.dump(model_data, filepath)
            return True
        except Exception as e:
            print(f"Error saving model: {e}")
            return False
    
    def load_model(self, filepath: str) -> bool:
        """Load trained model from file"""
        try:
            if not os.path.exists(filepath):
                return False
            
            model_data = joblib.load(filepath)
            self.models = model_data['models']
            self.active_model = model_data['active_model']
            self.scaler = model_data['scaler']
            self.label_encoders = model_data['label_encoders']
            self.is_trained = model_data['is_trained']
            self.feature_columns = model_data['feature_columns']
            self.model_metrics = model_data['model_metrics']
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            'is_trained': self.is_trained,
            'active_model': self.active_model,
            'available_models': list(self.models.keys()),
            'feature_columns': self.feature_columns,
            'metrics': self.model_metrics
        }