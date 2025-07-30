# Demo11 Application

Azure対応のWebアプリケーション - Python Flask + HTML/JavaScript

## 概要

Demo11は、Azureクラウドでの運用を想定したWebアプリケーションです。ローカル開発環境からAzure本番環境まで、シームレスなデプロイメントを実現します。

### 主な機能

- **Python Flask Backend**: RESTful API with Azure integration
- **HTML/JavaScript Frontend**: Modern responsive web interface  
- **Azure OpenAI Integration**: AI-powered chat functionality
- **Azure App Service Ready**: Production deployment configuration
- **Local Development**: Easy local setup and testing

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (HTML/JS)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Status    │  │    Chat     │  │   API Test  │        │
│  │   Panel     │  │   Interface │  │   Panel     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
                               HTTPS
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Python Flask)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    /api/    │  │    /api/    │  │    /api/    │        │
│  │   health    │  │    chat     │  │    info     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                                │
                               HTTPS
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Azure Services                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐              ┌─────────────────────────┐   │
│  │   Azure     │              │      Azure OpenAI      │   │
│  │ App Service │              │      (Optional)        │   │
│  └─────────────┘              └─────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 技術スタック

- **Backend**: Python 3.11, Flask, Gunicorn
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Cloud**: Azure App Service, Azure OpenAI
- **Development**: Local development server, Environment configuration

## セットアップ手順

### 前提条件

- Python 3.8以上
- pip (Python package manager)
- Git

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

Azure OpenAIを使用する場合は、`.env.local`ファイルを編集してください：

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

#### 1. Azure CLIでログイン

```bash
az login
```

#### 2. リソースグループの作成

```bash
az group create --name demo11-rg --location japaneast
```

#### 3. Azure App Serviceのデプロイ

```bash
# ARM テンプレートを使用したデプロイ
az deployment group create \
  --resource-group demo11-rg \
  --template-file azure-deploy/azuredeploy.json \
  --parameters azure-deploy/azuredeploy.parameters.json
```

#### 4. コードのデプロイ

```bash
# Azure App Service にコードをデプロイ
az webapp deployment source config \
  --name demo11-webapp \
  --resource-group demo11-rg \
  --repo-url https://github.com/ToshiEna/demo11.git \
  --branch main \
  --manual-integration
```

#### 5. Azure OpenAI設定（オプション）

Azure OpenAIを使用する場合は、App Serviceの設定でEnvironment Variablesを設定してください：

```bash
az webapp config appsettings set \
  --name demo11-webapp \
  --resource-group demo11-rg \
  --settings AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
              AZURE_OPENAI_KEY="your-api-key"
```

## API エンドポイント

### GET /api/health
システムのヘルスチェック

**レスポンス例:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "azure_openai_available": true
}
```

### GET /api/info
アプリケーション情報

**レスポンス例:**
```json
{
  "app_name": "Demo11 Application",
  "version": "1.0.0",
  "environment": "production",
  "features": {
    "azure_openai": true,
    "cors_enabled": true
  }
}
```

### POST /api/chat
Azure OpenAI チャット機能

**リクエスト:**
```json
{
  "message": "こんにちは"
}
```

**レスポンス例:**
```json
{
  "reply": "こんにちは！何かお手伝いできることはありますか？",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## 開発とテスト

### ローカルでのテスト

```bash
# アプリケーション起動
python app.py

# 別のターミナルでAPIテスト
curl http://localhost:5000/api/health
curl http://localhost:5000/api/info
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

### 本番環境でのテスト

デプロイ後、ブラウザで以下にアクセスしてテストしてください：

- https://demo11-webapp.azurewebsites.net/
- https://demo11-webapp.azurewebsites.net/api/health

## 設定項目

### 環境変数

| 変数名 | 説明 | デフォルト値 | 必須 |
|--------|------|-------------|------|
| `FLASK_DEBUG` | デバッグモード | `False` | No |
| `HOST` | バインドホスト | `0.0.0.0` | No |
| `PORT` | ポート番号 | `5000` | No |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI エンドポイント | - | OpenAI使用時 |
| `AZURE_OPENAI_KEY` | Azure OpenAI APIキー | - | OpenAI使用時 |
| `AZURE_OPENAI_VERSION` | Azure OpenAI APIバージョン | `2024-02-15-preview` | No |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI デプロイメント名 | `gpt-35-turbo` | No |

## トラブルシューティング

### よくある問題

#### 1. Azure OpenAIが利用できない
- `AZURE_OPENAI_ENDPOINT`と`AZURE_OPENAI_KEY`が正しく設定されているか確認
- Azure OpenAIリソースがアクティブな状態か確認

#### 2. ローカルでの起動に失敗
- Python 3.8以上がインストールされているか確認
- 仮想環境が有効化されているか確認
- 依存関係が正しくインストールされているか確認

#### 3. Azureデプロイメントが失敗
- Azure CLIが正しくログインされているか確認
- 必要な権限があるか確認
- リソースグループが存在するか確認

### ログの確認

**ローカル環境:**
```bash
# アプリケーションログは標準出力に表示されます
python app.py
```

**Azure環境:**
```bash
# Azure App Service のログストリーミング
az webapp log tail --name demo11-webapp --resource-group demo11-rg
```

## 貢献

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) ファイルを参照してください。

## サポート

問題が発生した場合は、[GitHub Issues](https://github.com/ToshiEna/demo11/issues) でお知らせください。