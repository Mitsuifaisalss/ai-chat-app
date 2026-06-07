# 🎌 Gemma AIチャットアプリ - プロジェクト紹介

## 概要
これは、**ローカルのAIモデル（Gemma 3）**を搭載した、完全に自分のマシン上で動くAIチャットアプリケーションです。インターネット検索機能も搭載しており、最新の情報に基づいた回答が得られます。

---

## 主な特徴

🤖 **ローカルAIモデル**
- Ollama + Gemma 3を使用
- クラウドサービス（OpenAI、Anthropicなど）に依存しない
- データは自分のマシンのみに保存され、プライバシーが保護される
- インターネットがなくても動作可能

🌐 **Web検索機能**
- DuckDuckGoを使用した無料のWeb検索
- 最新の情報を自動的に取得
- 回答にソース（出典リンク）を表示
- Webからスクレイピングした情報をAIプロンプトに注入

💻 **フルスタックアプリケーション**
- モダンで美しい管理画面（ダークモード/ライトモード）
- リアルタイムのストリーミング応答
- チャット履歴の保存（localStorage + SQLite）
- モバイル対応のレスポンシブデザイン
- アカウント認証システム（登録/ログイン）

🔓 **パブリックアクセス**
- ngrokを使用してインターネット上に公開
- どこからでもアクセス可能
- URLを友達と共有して使える

---

## 使用している技術スタック

### バックエンド
| 技術 | 用途 |
|------|------|
| **Python 3.12** | メインプログラミング言語 |
| **FastAPI** | 高速なWebフレームワーク（WebSocket対応） |
| **Ollama** | ローカルLLMの実行環境 |
| **DuckDuckGo Search** | 無料のWeb検索 |
| **BeautifulSoup** | Webページのスクレイピング |
| **SQLite + SQLModel** | ユーザーデータとチャット履歴の保存 |
| **JWT Token** | ユーザー認証 |
| **uvicorn** | ASGIサーバー |

### フロントエンド
| 技術 | 用途 |
|------|------|
| **React 18** | UIフレームワーク |
| **TypeScript** | 型安全な開発 |
| **Vite** | 高速なビルドツール |
| **Tailwind CSS** | スタイリング |
| **react-markdown** | Markdown表示 |
| **WebSocket** | リアルタイム通信 |

### DevOps/インフラ
| 技術 | 用途 |
|------|------|
| **ngrok** | ローカルサーバーをインターネットにトンネリング |
| **Cloudflared** | 代替トンネリングソリューション |
| **macOS LaunchAgent** | システム起動時の自動実行 |

---

## プロジェクト構造
```
ai-chat-app/
├── backend/              # Python FastAPIバックエンド
│   ├── main.py           # FastAPIアプリ（API + WebSocket）
│   ├── llm.py            # Ollamaクライアント
│   ├── search.py         # Web検索 + スクレイピング
│   ├── router.py         # 検索判定ロジック
│   ├── auth.py           # 認証（JWT + パスワードハッシュ）
│   ├── db.py             # SQLiteデータベース
│   └── requirements.txt  # Python依存関係
├── frontend/             # Reactフロントエンド
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/   # UIコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   └── styles/       # CSSスタイル
│   └── package.json
├── setup.sh             # セットアップスクリプト
├── start.sh             # 起動スクリプト
└── autostart-ngrok.sh  # 自動起動スクリプト
```

---

## セットアップ方法

### 前提条件
- macOS（これはMacBook Pro用に構築されています）
- Python 3.12
- Node.js + npm
- Homebrew

### インストール
```bash
git clone https://github.com/Mitsuifaisalss/ai-chat-app.git
cd ai-chat-app
chmod +x setup.sh start.sh
./setup.sh
```

### 起動
```bash
./start.sh
```

### 自動起動（推奨）
システム起動時に自動的に起動するように設定されています：
```bash
launchctl load ~/Library/LaunchAgents/com.mitsuifaisalss.aichatapp-ngrok.plist
```

---

## GitHubリポジトリ
🔗 https://github.com/Mitsuifaisalss/ai-chat-app

---

## 開発者
**Faisal Shahzad** (三ツ井 ファイサル・シャフザード)
<br>SAK University

このプロジェクトは、ローカルで動作するAIアシスタントの可能性を探求し、クラウドサービスへの依存なしにプライバシーを保護するために構築されました。
