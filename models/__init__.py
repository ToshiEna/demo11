"""
Demand Prediction Models
Data classes and utilities for demand prediction functionality
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np


@dataclass
class DemandData:
    """Data class for demand data points"""
    date: datetime
    product_id: str
    demand_value: float
    price: Optional[float] = None
    promotion: Optional[bool] = None
    weather_condition: Optional[str] = None
    seasonality_factor: Optional[float] = None


@dataclass
class PredictionRequest:
    """Data class for prediction requests"""
    product_id: str
    start_date: datetime
    end_date: datetime
    include_confidence_interval: bool = True
    additional_features: Optional[Dict[str, Any]] = None


@dataclass
class PredictionResult:
    """Data class for prediction results"""
    product_id: str
    prediction_date: datetime
    predicted_demand: float
    confidence_lower: Optional[float] = None
    confidence_upper: Optional[float] = None
    model_accuracy: Optional[float] = None
    

class DemandDataProcessor:
    """Data processor for demand prediction"""
    
    def __init__(self):
        self.data = pd.DataFrame()
        
    def load_data(self, data: List[DemandData]) -> bool:
        """Load demand data into the processor"""
        try:
            # Convert to DataFrame
            data_dicts = []
            for item in data:
                data_dicts.append({
                    'date': item.date,
                    'product_id': item.product_id,
                    'demand_value': item.demand_value,
                    'price': item.price,
                    'promotion': item.promotion,
                    'weather_condition': item.weather_condition,
                    'seasonality_factor': item.seasonality_factor
                })
            
            self.data = pd.DataFrame(data_dicts)
            self.data['date'] = pd.to_datetime(self.data['date'])
            self.data = self.data.sort_values('date')
            
            return True
        except Exception as e:
            print(f"Error loading data: {e}")
            return False
    
    def preprocess_data(self) -> pd.DataFrame:
        """Preprocess data for prediction"""
        if self.data.empty:
            return pd.DataFrame()
        
        # Create time-based features
        self.data['year'] = self.data['date'].dt.year
        self.data['month'] = self.data['date'].dt.month
        self.data['day_of_week'] = self.data['date'].dt.dayofweek
        self.data['quarter'] = self.data['date'].dt.quarter
        
        # Handle missing values
        self.data['price'] = self.data['price'].fillna(self.data['price'].median())
        self.data['promotion'] = self.data['promotion'].fillna(False)
        self.data['seasonality_factor'] = self.data['seasonality_factor'].fillna(1.0)
        
        # Create lag features
        for product in self.data['product_id'].unique():
            product_mask = self.data['product_id'] == product
            product_data = self.data[product_mask].copy()
            
            # Create lag features (previous 1, 7, 30 days)
            for lag in [1, 7, 30]:
                lag_col = f'demand_lag_{lag}'
                self.data.loc[product_mask, lag_col] = product_data['demand_value'].shift(lag)
        
        return self.data
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get data statistics"""
        if self.data.empty:
            return {}
        
        stats = {
            'total_records': len(self.data),
            'unique_products': self.data['product_id'].nunique(),
            'date_range': {
                'start': self.data['date'].min().isoformat(),
                'end': self.data['date'].max().isoformat()
            },
            'demand_stats': {
                'mean': float(self.data['demand_value'].mean()),
                'median': float(self.data['demand_value'].median()),
                'std': float(self.data['demand_value'].std()),
                'min': float(self.data['demand_value'].min()),
                'max': float(self.data['demand_value'].max())
            }
        }
        
        return stats