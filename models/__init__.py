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
    """Data class for demand data points - Retail format"""
    sales_date: datetime  # SALES DATE
    store: str           # STORE
    sku: str            # SKU  
    desc: str           # DESC
    div: str            # DIV
    div_desc: str       # DIV DESC
    dept: str           # DEPT
    dept_desc: str      # DEPT DESC
    sold_qty: float     # SOLD QTY
    act_sales: float    # ACT SALES
    # Optional fields for predictions and promotions
    price: Optional[float] = None
    promotion: Optional[bool] = None
    promotion_discount: Optional[float] = None
    weather_condition: Optional[str] = None
    seasonality_factor: Optional[float] = None
    
    # Legacy compatibility
    @property
    def date(self) -> datetime:
        return self.sales_date
    
    @property 
    def product_id(self) -> str:
        return self.sku
        
    @property
    def demand_value(self) -> float:
        return self.sold_qty


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
                    'sales_date': item.sales_date,
                    'store': item.store,
                    'sku': item.sku,
                    'desc': item.desc,
                    'div': item.div,
                    'div_desc': item.div_desc,
                    'dept': item.dept,
                    'dept_desc': item.dept_desc,
                    'sold_qty': item.sold_qty,
                    'act_sales': item.act_sales,
                    'price': item.price,
                    'promotion': item.promotion,
                    'promotion_discount': item.promotion_discount,
                    'weather_condition': item.weather_condition,
                    'seasonality_factor': item.seasonality_factor,
                    # Legacy compatibility
                    'date': item.sales_date,
                    'product_id': item.sku,
                    'demand_value': item.sold_qty
                })
            
            self.data = pd.DataFrame(data_dicts)
            self.data['sales_date'] = pd.to_datetime(self.data['sales_date'])
            self.data['date'] = pd.to_datetime(self.data['date'])
            self.data = self.data.sort_values('sales_date')
            
            return True
        except Exception as e:
            print(f"Error loading data: {e}")
            return False
    
    def preprocess_data(self) -> pd.DataFrame:
        """Preprocess data for prediction"""
        if self.data.empty:
            return pd.DataFrame()
        
        # Create time-based features
        self.data['year'] = self.data['sales_date'].dt.year
        self.data['month'] = self.data['sales_date'].dt.month
        self.data['day_of_week'] = self.data['sales_date'].dt.dayofweek
        self.data['quarter'] = self.data['sales_date'].dt.quarter
        
        # Handle missing values
        self.data['price'] = self.data['price'].fillna(self.data['act_sales'] / self.data['sold_qty'].replace(0, np.nan))
        self.data['price'] = self.data['price'].fillna(self.data['price'].median())
        self.data['promotion'] = self.data['promotion'].fillna(False)
        self.data['promotion_discount'] = self.data['promotion_discount'].fillna(0.0)
        self.data['seasonality_factor'] = self.data['seasonality_factor'].fillna(1.0)
        
        # Create lag features by store and SKU
        for store in self.data['store'].unique():
            for sku in self.data[self.data['store'] == store]['sku'].unique():
                mask = (self.data['store'] == store) & (self.data['sku'] == sku)
                store_sku_data = self.data[mask].copy()
                
                # Create lag features (previous 1, 7, 30 days)
                for lag in [1, 7, 30]:
                    lag_col = f'sold_qty_lag_{lag}'
                    self.data.loc[mask, lag_col] = store_sku_data['sold_qty'].shift(lag)
                    
                    # Also create moving averages
                    if lag == 7:
                        ma_col = f'sold_qty_ma_{lag}'
                        self.data.loc[mask, ma_col] = store_sku_data['sold_qty'].rolling(window=lag).mean()
        
        return self.data
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get data statistics"""
        if self.data.empty:
            return {}
        
        stats = {
            'total_records': len(self.data),
            'unique_stores': self.data['store'].nunique() if 'store' in self.data.columns else 0,
            'unique_skus': self.data['sku'].nunique() if 'sku' in self.data.columns else self.data['product_id'].nunique(),
            'unique_products': self.data['sku'].nunique() if 'sku' in self.data.columns else self.data['product_id'].nunique(),
            'unique_divisions': self.data['div'].nunique() if 'div' in self.data.columns else 0,
            'unique_departments': self.data['dept'].nunique() if 'dept' in self.data.columns else 0,
            'date_range': {
                'start': (self.data['sales_date'] if 'sales_date' in self.data.columns else self.data['date']).min().isoformat(),
                'end': (self.data['sales_date'] if 'sales_date' in self.data.columns else self.data['date']).max().isoformat()
            },
            'sales_stats': {
                'total_sales': float(self.data['act_sales'].sum()) if 'act_sales' in self.data.columns else 0,
                'avg_sales_per_day': float(self.data['act_sales'].mean()) if 'act_sales' in self.data.columns else 0,
                'total_qty_sold': float(self.data['sold_qty'].sum()) if 'sold_qty' in self.data.columns else 0,
                'avg_qty_per_day': float(self.data['sold_qty'].mean()) if 'sold_qty' in self.data.columns else 0,
            },
            'demand_stats': {
                'mean': float((self.data['sold_qty'] if 'sold_qty' in self.data.columns else self.data['demand_value']).mean()),
                'median': float((self.data['sold_qty'] if 'sold_qty' in self.data.columns else self.data['demand_value']).median()),
                'std': float((self.data['sold_qty'] if 'sold_qty' in self.data.columns else self.data['demand_value']).std()),
                'min': float((self.data['sold_qty'] if 'sold_qty' in self.data.columns else self.data['demand_value']).min()),
                'max': float((self.data['sold_qty'] if 'sold_qty' in self.data.columns else self.data['demand_value']).max())
            },
            'promotion_stats': {
                'total_promotion_days': int(self.data['promotion'].sum()) if 'promotion' in self.data.columns else 0,
                'promotion_rate': float(self.data['promotion'].mean()) if 'promotion' in self.data.columns else 0,
                'avg_promotion_discount': float(self.data['promotion_discount'].mean()) if 'promotion_discount' in self.data.columns else 0
            }
        }
        
        return stats