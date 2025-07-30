# Demand Prediction System

Azure対応のAI需要予測システム - Python Flask + Machine Learning + Azure統合

## 概要

Demand Prediction Systemは、機械学習を活用した高精度な需要予測を行うAIプラットフォームです。Azureクラウドでの運用を前提として設計され、データアップロードから予測生成、可視化まで統合されたソリューションを提供します。

### 主な機能

- **AI-Powered Predictions**: 複数の機械学習モデル（Random Forest、Gradient Boosting、Linear Regression）による高精度な需要予測
- **Data Management**: CSV形式のデータアップロード、データ前処理、統計分析
- **Interactive Visualization**: Plotlyを使用したインタラクティブな可視化（時系列、分布、比較、季節性分析）
- **Model Training**: 自動化された機械学習モデルの訓練と評価
- **Azure Integration**: Azure App Service、Azure OpenAI、Azure Storage Blobとの統合
- **Real-time Analytics**: リアルタイムでの予測生成と分析結果の表示

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (HTML/JS)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Data     │  │   Model     │  │ Prediction  │        │
│  │ Management  │  │  Training   │  │ & Analysis  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Visualization│  │   System    │  │  Settings   │        │
│  │ Dashboard   │  │   Status    │  │ & Config    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
                             REST API
                                │
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Python Flask)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Data     │  │   Machine   │  │ Prediction  │        │
│  │  Processor  │  │  Learning   │  │   Engine    │        │
│  │             │  │   Models    │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │Visualization│  │    API      │  │   Health    │        │
│  │   Engine    │  │  Endpoints  │  │  Monitor    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
                          Azure Services
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Azure Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Azure     │  │    Azure    │  │   Azure     │        │
│  │ App Service │  │   OpenAI    │  │   Storage   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Azure     │  │   Azure     │  │  Application│        │
│  │  Monitor    │  │   KeyVault  │  │   Insights  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 技術スタック

- **Backend**: Python 3.11, Flask, scikit-learn, pandas, numpy
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Plotly.js
- **Machine Learning**: Random Forest, Gradient Boosting, Linear Regression
- **Data Science**: pandas, numpy, matplotlib, seaborn, plotly
- **Cloud**: Azure App Service, Azure OpenAI, Azure Storage, Azure Monitor
- **Development**: Local development server, Environment configuration

## セットアップ手順

### 前提条件

- Python 3.8以上
- pip (Python package manager)
- Git
- 8GB以上のRAM（機械学習モデル訓練用）

### ローカル開発環境

#### 1. リポジトリのクローン

```bash
git clone https://github.com/ToshiEna/demo11.git
cd demo11
```

#### 2. 仮想環境の作成と有効化

```bash
# Windowsの場合
python -m venv venv
venv\Scripts\activate

# macOS/Linuxの場合
python3 -m venv venv
source venv/bin/activate
```

#### 3. 依存関係のインストール

```bash
pip install -r requirements.txt
```

#### 4. 環境設定（オプション）

Azure OpenAIを使用する場合は、`.env.local`ファイルを作成してください：

```bash
# .env.localファイルの設定例
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT=gpt-35-turbo
```

#### 5. アプリケーションの起動

```bash
python app.py
```

アプリケーションは http://localhost:5000 でアクセスできます。

### Azure本番環境デプロイ

#### 前提条件

- Azure CLI がインストールされていること
- Azureサブスクリプションへのアクセス権限
- Azure Machine Learning Serviceのアクセス権限

#### 1. Azure CLIでログイン

```bash
az login
```

#### 2. リソースグループの作成

```bash
az group create --name demand-prediction-rg --location japaneast
```

#### 3. Azure App Serviceのデプロイ

```bash
# ARM テンプレートを使用したデプロイ
az deployment group create \
  --resource-group demand-prediction-rg \
  --template-file azure-deploy/azuredeploy.json \
  --parameters azure-deploy/azuredeploy.parameters.json
```

#### 4. コードのデプロイ

```bash
# Azure App Service にコードをデプロイ
az webapp deployment source config \
  --name demand-prediction-webapp \
  --resource-group demand-prediction-rg \
  --repo-url https://github.com/ToshiEna/demo11.git \
  --branch main \
  --manual-integration
```

#### 5. Azure設定（オプション）

Azure OpenAIやその他のサービスを使用する場合は、App Serviceの設定でEnvironment Variablesを設定してください：

```bash
az webapp config appsettings set \
  --name demand-prediction-webapp \
  --resource-group demand-prediction-rg \
  --settings AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
              AZURE_OPENAI_KEY="your-api-key"
```

## API エンドポイント

### System Endpoints

#### GET /api/health
システムのヘルスチェック

**レスポンス例:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "azure_openai_available": false,
  "data_science_available": true,
  "prediction_models_available": true,
  "model_trained": true
}
```

#### GET /api/info
アプリケーション情報とモデル状態

**レスポンス例:**
```json
{
  "app_name": "Demand Prediction System",
  "version": "2.0.0",
  "description": "AI-powered demand forecasting and analytics platform",
  "environment": "production",
  "features": {
    "demand_prediction": true,
    "data_visualization": true,
    "azure_openai": false,
    "cors_enabled": true,
    "file_upload": true,
    "model_training": true
  },
  "model_info": {
    "is_trained": true,
    "active_model": "random_forest",
    "available_models": ["random_forest", "gradient_boosting", "linear_regression"],
    "feature_columns": ["year", "month", "day_of_week", "price", "promotion"],
    "metrics": {
      "random_forest": {
        "mae": 8.5,
        "mse": 125.2,
        "rmse": 11.2,
        "r2": 0.85
      }
    }
  }
}
```

### Data Management Endpoints

#### POST /api/data/upload
需要データのアップロード（CSVまたはJSON形式）

**JSONリクエスト例:**
```json
{
  "data": [
    {
      "date": "2024-01-01T00:00:00Z",
      "product_id": "PROD_001",
      "demand_value": 100,
      "price": 10.99,
      "promotion": false,
      "weather_condition": "sunny",
      "seasonality_factor": 1.0
    }
  ]
}
```

**レスポンス例:**
```json
{
  "success": true,
  "message": "Successfully loaded 100 records",
  "statistics": {
    "total_records": 100,
    "unique_products": 5,
    "date_range": {
      "start": "2024-01-01T00:00:00+00:00",
      "end": "2024-03-31T00:00:00+00:00"
    },
    "demand_stats": {
      "mean": 125.5,
      "median": 120.0,
      "std": 25.8,
      "min": 80.0,
      "max": 200.0
    }
  }
}
```

#### GET /api/data/statistics
データ統計情報の取得

### Model Training Endpoints

#### POST /api/model/train
機械学習モデルの訓練

**レスポンス例:**
```json
{
  "success": true,
  "models_trained": 3,
  "active_model": "random_forest",
  "metrics": {
    "random_forest": {
      "mae": 8.5,
      "mse": 125.2,
      "rmse": 11.2,
      "r2": 0.85
    },
    "gradient_boosting": {
      "mae": 9.2,
      "mse": 135.8,
      "rmse": 11.6,
      "r2": 0.82
    },
    "linear_regression": {
      "mae": 12.1,
      "mse": 180.5,
      "rmse": 13.4,
      "r2": 0.75
    }
  },
  "training_samples": 800,
  "test_samples": 200
}
```

### Prediction Endpoints

#### POST /api/predict
需要予測の実行

**リクエスト例:**
```json
{
  "product_id": "PROD_001",
  "start_date": "2025-01-01T00:00:00Z",
  "end_date": "2025-01-07T23:59:59Z",
  "include_confidence_interval": true
}
```

**レスポンス例:**
```json
{
  "success": true,
  "predictions": [
    {
      "product_id": "PROD_001",
      "prediction_date": "2025-01-01T00:00:00",
      "predicted_demand": 125.8,
      "confidence_lower": 115.2,
      "confidence_upper": 136.4,
      "model_accuracy": 0.85
    }
  ],
  "request": {
    "product_id": "PROD_001",
    "start_date": "2025-01-01T00:00:00+00:00",
    "end_date": "2025-01-07T23:59:59+00:00"
  }
}
```

### Visualization Endpoints

#### GET /api/visualize/{chart_type}
データ可視化チャートの生成

利用可能なチャート:
- `demand_over_time`: 時系列需要チャート
- `demand_distribution`: 需要分布ヒストグラム
- `product_comparison`: 商品別需要比較
- `seasonal_pattern`: 季節性パターン分析

## 使用方法

### 1. データアップロード

1. **Data Management**タブを開く
2. CSVファイルをアップロードするか、サンプルデータを読み込む
3. 必須列: `date`, `product_id`, `demand_value`
4. オプション列: `price`, `promotion`, `weather_condition`, `seasonality_factor`

### 2. モデル訓練

1. **Model Training**タブを開く
2. 「Train Model」ボタンをクリック
3. 複数のモデルが自動的に訓練され、最適なモデルが選択される

### 3. 需要予測

1. **Prediction**タブを開く
2. 商品ID、開始日、終了日を入力
3. 「Predict Demand」ボタンをクリックして予測を生成

### 4. データ可視化

1. **Visualization**タブを開く
2. 表示したいチャートタイプを選択
3. インタラクティブなグラフが生成される

## データ形式要件

### CSVファイル形式

```csv
date,product_id,demand_value,price,promotion,weather_condition,seasonality_factor
2024-01-01,PROD_001,100,10.99,false,sunny,1.0
2024-01-02,PROD_001,120,10.99,true,cloudy,1.1
2024-01-03,PROD_001,95,10.99,false,rainy,0.9
```

### 必須フィールド

- **date**: ISO形式の日付 (YYYY-MM-DD または YYYY-MM-DDTHH:MM:SSZ)
- **product_id**: 商品識別子（文字列）
- **demand_value**: 需要量（数値）

### オプションフィールド

- **price**: 商品価格（数値）
- **promotion**: プロモーション実施有無（true/false）
- **weather_condition**: 天候条件（文字列: sunny, cloudy, rainy, etc.）
- **seasonality_factor**: 季節性係数（数値: 0.1-2.0）

## 機械学習モデル

### Random Forest (デフォルト)
- **特徴**: 高い精度、過学習に強い、特徴量重要度を提供
- **用途**: 汎用的な需要予測、非線形関係の捕捉

### Gradient Boosting
- **特徴**: 逐次学習、高い予測精度
- **用途**: 複雑なパターンの学習、時系列特徴の活用

### Linear Regression
- **特徴**: 解釈しやすい、計算が高速
- **用途**: ベースライン予測、線形関係の分析

### 特徴量エンジニアリング

システムは自動的に以下の特徴量を生成します：

- **時間特徴**: 年、月、曜日、四半期
- **ラグ特徴**: 1日前、7日前、30日前の需要
- **統計特徴**: 移動平均、標準偏差
- **カテゴリ特徴**: 商品ID、天候条件のエンコーディング

## 性能とスケーラビリティ

### ローカル環境
- **推奨データサイズ**: 10,000レコード以下
- **メモリ使用量**: 2-4GB
- **処理時間**: 訓練 1-5分、予測 数秒

### Azure環境
- **スケール**: 数百万レコードまで対応
- **並列処理**: Azure Machine Learning Service活用
- **自動スケーリング**: App Serviceのオートスケール機能

## トラブルシューティング

### よくある問題

#### 1. データアップロードエラー
- **原因**: CSVフォーマットの問題、必須列の不足
- **解決**: データ形式要件を確認、サンプルデータで動作テスト

#### 2. モデル訓練の失敗
- **原因**: データ不足（最低10レコード必要）、メモリ不足
- **解決**: より多くのデータを用意、システムリソースの確認

#### 3. 予測エラー
- **原因**: モデル未訓練、存在しない商品IDの指定
- **解決**: モデル訓練の実行、商品IDの確認

#### 4. 可視化の表示問題
- **原因**: データ不足、ブラウザの互換性問題
- **解決**: データの確認、モダンブラウザの使用

### ログの確認

**ローカル環境:**
```bash
# アプリケーションログは標準出力に表示されます
python app.py
```

**Azure環境:**
```bash
# Azure App Service のログストリーミング
az webapp log tail --name demand-prediction-webapp --resource-group demand-prediction-rg

# Application Insightsでの詳細ログ確認
az monitor app-insights query \
  --app your-app-insights-name \
  --analytics-query "traces | order by timestamp desc | take 100"
```

## パフォーマンス最適化

### データ処理の最適化
- データの事前集約
- 不要な特徴量の除去
- データタイプの最適化

### モデルの最適化
- ハイパーパラメータチューニング
- 特徴量選択
- アンサンブル手法の活用

### システムの最適化
- キャッシュの活用
- 非同期処理の実装
- CDNの使用

## セキュリティ

### データ保護
- データの暗号化（保存時・転送時）
- アクセス制御の実装
- 個人情報の匿名化

### Azure統合
- Azure Key Vaultでの機密情報管理
- Managed Identityの使用
- ネットワークセキュリティグループの設定

## 監視とメンテナンス

### システム監視
- Azure Monitorによる性能監視
- Application Insightsによるアプリケーション監視
- カスタムメトリクスの設定

### モデルの監視
- 予測精度の継続的な評価
- データドリフトの検出
- 自動再訓練の実装

## 今後の拡張予定

### 短期計画
- リアルタイム予測API
- バッチ処理の最適化
- 多言語対応

### 中期計画
- Deep Learningモデルの統合
- AutoMLの実装
- ストリーミングデータ対応

### 長期計画
- 多変量時系列予測
- 強化学習の活用
- エッジ展開

## 貢献

プロジェクトへの貢献を歓迎します：

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add demand prediction feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン
- PEP 8スタイルガイドに従う
- 適切なテストを書く
- ドキュメントを更新する
- セキュリティベストプラクティスを遵守する

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## サポート

技術的なサポートや質問は以下で受け付けています：

- **GitHub Issues**: [バグ報告・機能要求](https://github.com/ToshiEna/demo11/issues)
- **ディスカッション**: [技術的な質問・アイデア共有](https://github.com/ToshiEna/demo11/discussions)
- **Azure サポート**: 本番環境での問題はAzureサポートチケットを作成

### よくある質問 (FAQ)

**Q: 最小限のデータ要件は？**
A: モデル訓練には最低10レコード必要ですが、実用的な精度には100レコード以上を推奨します。

**Q: 複数商品の同時予測は可能？**
A: 現在は単一商品ずつの予測ですが、APIを複数回呼び出すことで実現できます。

**Q: カスタムモデルの追加は可能？**
A: はい。`models/predictor.py`を拡張することでカスタムモデルを追加できます。

**Q: 予測期間の制限は？**
A: 技術的な制限はありませんが、長期予測（30日以上）は精度が低下する可能性があります。

---

**Demand Prediction System** - AI-powered demand forecasting for the modern enterprise.