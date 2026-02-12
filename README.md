# 🎭 Code Theater | 代码拟人化剧场

> **Turn your code into a living, breathing animated story.**  
> **把你的代码变成一部生动的动画故事。**

![Code Theater Demo](https://placehold.co/800x400/2d2d2d/fff?text=Code+Theater+Preview)

## 🌟 Introduction (简介)

**Code Theater** is an AI-powered visualization tool that parses your Python code and turns it into a stage play. Functions become robots, variables become spheres, and classes become fortresses. Watch them interact, speak, and execute your logic in a hilarious and educational way!

**Code Theater** 是一个 AI 驱动的可视化工具，它能解析你的 Python 代码并将其转化为舞台剧。函数变成了机器人，变量变成了球体，类变成了堡垒。看着它们互动、对话，以一种幽默且寓教于乐的方式执行你的逻辑！

## ✨ Features (功能亮点)

- **🤖 AI-Powered Scripting**: Uses LLMs (DeepSeek, Zhipu AI, OpenAI, etc.) to generate witty dialogue and plot based on your code logic.
  - *AI 驱动剧本*：利用大模型（DeepSeek, 智谱 AI, OpenAI 等）根据代码逻辑生成机智的对话和剧情。
- **🌍 Multi-Language Support**: Switch between **English**, **Chinese (中文)**, **Japanese (日本語)**, and **French (Français)** instantly.
  - *多语言支持*：一键切换英语、中文、日语和法语，体验不同风格的“代码人格”。
- **🎭 Error Dramatization**: Syntax errors aren't just red text anymore—they are villains that crash the stage!
  - *错误戏剧化*：语法错误不再只是红字，而是会变成大反派大闹舞台！
- **⚡ Local Fallback**: No API key? No problem! It includes a deterministic algorithm to ensure it always works offline.
  - *本地保底*：没有 API Key？没问题！内置确定性算法，确保离线也能完美运行。

## 🛠️ Tech Stack (技术栈)

- **Frontend**: React, Vite, PixiJS (WebGL)
- **Backend**: FastAPI (Python), Uvicorn
- **AI Integration**: OpenAI SDK (Compatible with DeepSeek, Zhipu AI, Gemini)

## 🚀 Getting Started (快速开始)

### Prerequisites (环境要求)
- Node.js (v16+)
- Python (3.8+)

### Installation (安装步骤)

1.  **Clone the repository (克隆仓库)**
    ```bash
    git clone https://github.com/your-username/code-theater.git
    cd code-theater
    ```

2.  **Setup Backend (配置后端)**
    ```bash
    cd backend
    python -m venv venv
    
    # Windows
    venv\Scripts\activate
    # Mac/Linux
    # source venv/bin/activate
    
    pip install -r requirements.txt
    ```

3.  **Setup Frontend (配置前端)**
    ```bash
    cd ../frontend
    npm install
    ```

### Configuration (配置 API Key)

To enable AI features, set the following environment variables in your terminal before running the backend (Windows PowerShell example):

*为了启用 AI 功能，请在运行后端前设置以下环境变量（以 Windows PowerShell 为例）：*

```powershell
# Recommended for Chinese users (Domestic, Fast & Stable)
$env:ZHIPUAI_API_KEY="your_zhipu_key"
# OR
$env:DEEPSEEK_API_KEY="your_deepseek_key"

# International users
$env:OPENAI_API_KEY="sk-..."
```

*Note: If no key is provided, the app will run in "Offline Mode" using a basic script generator.*
*注意：如果不提供 Key，应用将以“离线模式”运行，使用基础剧本生成器。*

### Run (运行)

1.  **Start Backend (启动后端)**
    ```bash
    # Inside /backend
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
    ```

2.  **Start Frontend (启动前端)**
    ```bash
    # Inside /frontend
    npm run dev
    ```

Open your browser at `http://localhost:5173` (or the port shown in terminal).

## 🎮 How to Play (使用方法)

1.  **Paste Code**: Enter any Python snippet (e.g., a Bubble Sort or a simple Class).
    - *粘贴代码*：输入任意 Python 代码片段。
2.  **Choose Language**: Click the flag icon to switch between EN/ZH/JA/FR.
    - *选择语言*：点击旗帜图标切换语言风格。
3.  **Visualize**: Click the button and watch the show!
    - *生成剧场*：点击按钮，欣赏表演！
4.  **Interact**: Click "Next" to step through the execution flow.
    - *互动*：点击“下一步”推进剧情。

---

## 📄 License

MIT License. Feel free to fork and star! ⭐
