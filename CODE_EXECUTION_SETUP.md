# Code Execution Sandbox - Setup Guide

## 🎯 Overview

The CrowdAI platform now includes a **secure code execution sandbox** with:
- ✅ Docker containerization for Python & JavaScript
- ✅ Automatic fallback to local execution
- ✅ Data visualization support (matplotlib charts)
- ✅ Resource limits (CPU, Memory, Timeout)
- ✅ Network isolation
- ✅ Visual indicators for sandboxed execution

## 📋 Prerequisites

### Required
- Node.js 18+ and npm
- Python 3.11+ (for local fallback)
- Docker Desktop (recommended for production security)

### Optional
- Docker Desktop running for containerized execution
- If Docker unavailable, falls back to local execution automatically

## 🚀 Installation

### 1. Install Dependencies

```bash
cd Chat
npm install
```

New dependencies added:
- `dockerode` - Docker API client
- `tar-stream` - TAR archive creation
- `chart.js` & `react-chartjs-2` - Chart visualization
- `react-chartjs-2` - React bindings for Chart.js

### 2. Setup Docker (Optional but Recommended)

#### Pull Required Images

```bash
# Python with visualization libraries
docker pull python:3.11-slim

# Or build custom image with pre-installed libraries
docker build -f Dockerfile.python -t crowdai-python:latest .

# Node.js
docker pull node:20-slim
```

#### Verify Docker

```bash
docker ps
# Should show Docker is running
```

### 3. Start Application

```bash
npm start
```

This runs both:
- **Frontend**: http://localhost:5175 (Vite dev server)
- **Backend**: http://localhost:3001 (Express API server)

## 🔒 Security Features

### Docker Containerization

When Docker is available:
- **Memory Limit**: 512 MB
- **CPU Limit**: 50% of one core
- **Network**: Disabled (no internet access)
- **Timeout**: 30 seconds
- **Auto-cleanup**: Containers removed after execution

### Local Execution Fallback

If Docker unavailable:
- **Timeout**: 10 seconds
- **Buffer Limit**: 1 MB output
- **Temp file cleanup**: Automatic
- **Process isolation**: Basic

## 📊 Data Visualization

### Python Matplotlib Support

The sandbox automatically detects and captures matplotlib plots:

```python
import matplotlib.pyplot as plt
import numpy as np

# Create data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Plot
plt.figure()
plt.plot(x, y)
plt.title('Sine Wave')
plt.xlabel('X')
plt.ylabel('Y')
plt.grid(True)

# Charts are automatically captured and displayed!
```

### Features:
- Multiple plots per execution
- Base64 encoded PNG images
- Automatic figure cleanup
- High-resolution output (100 DPI)

## 🧪 Testing

### Test Python Code

```python
print("Hello from sandboxed Python!")

# With visualization
import matplotlib.pyplot as plt
plt.plot([1,2,3,4], [1,4,9,16])
plt.title("Square Numbers")
```

### Test JavaScript Code

```javascript
console.log("Hello from sandboxed Node.js!");

const data = [1, 2, 3, 4, 5];
const doubled = data.map(x => x * 2);
console.log("Doubled:", doubled);
```

### Test Timeout

```python
import time
time.sleep(35)  # Will timeout after 30s in Docker
```

## 🎨 UI Features

### Code Block Detection

The system automatically detects code blocks in AI responses:

\`\`\`python
print("This will have a Run button")
\`\`\`

### Execution Results

- **Success**: Green background, output displayed
- **Error**: Red background, error message shown
- **Sandboxed**: Blue "🐳 Sandboxed" badge
- **Charts**: Displayed inline below output

## 🔧 Troubleshooting

### Backend Not Starting

If you see "Failed to connect to localhost port 3001":

```bash
# Check if backend is running
netstat -ano | findstr :3001

# If not, start manually:
cd Chat
npm run server
```

### Docker Not Working

The system will automatically fall back to local execution. Check logs:
```
⚠️ [DOCKER] Docker not available, falling back to local execution
```

### Python Matplotlib Not Found

For local execution, install matplotlib:
```bash
pip install matplotlib numpy
```

### Frontend Build Errors

If Chart.js import errors occur:
```bash
cd Chat
rm -rf node_modules package-lock.json
npm install
```

## 📁 File Structure

```
Chat/
├── server/
│   └── server.js           # Updated with Docker execution
├── src/
│   └── Chat.jsx            # Updated with visualization display
├── Dockerfile.python       # Custom Python image (optional)
├── package.json            # Updated dependencies
└── CODE_EXECUTION_SETUP.md # This file
```

## 🚨 Production Considerations

### Must Have for Production:
1. Docker Desktop installed and running
2. Resource monitoring and limits
3. Rate limiting on /api/execute-code
4. User authentication
5. Execution logging and auditing

### Recommended Enhancements:
- User-specific execution quotas
- Code size limits
- Output size limits
- Persistent container pooling
- Multi-language support expansion

## 📊 Monitoring

### Backend Logs

Watch for execution indicators:
```
🔧 [CODE EXECUTION] Request received for python
🐳 [DOCKER] Docker available, using containerized execution
✅ [DOCKER] Execution successful
```

Or:
```
⚠️ [DOCKER] Docker not available, falling back to local execution
✅ [LOCAL] PYTHON execution successful
```

## ⚡ Performance

### Docker Execution:
- Initial run: ~3-5 seconds (image pull)
- Subsequent runs: ~500ms-1s
- With visualization: +500ms-1s

### Local Execution:
- Python: ~100-500ms
- JavaScript: ~50-200ms

## 🎯 Next Steps

1. **Test basic execution**: Run simple print/console.log
2. **Test visualizations**: Run matplotlib example
3. **Test security**: Try network access (should fail in Docker)
4. **Test timeouts**: Run long-running code
5. **Production setup**: Ensure Docker running in production

## 📞 Support

If issues persist:
1. Check terminal output for detailed error messages
2. Verify Docker Desktop is running (for containerized execution)
3. Ensure all dependencies installed: `npm install`
4. Check Python/Node.js versions meet requirements
5. Review server logs for execution attempts

---

**Status**: ✅ Feature Complete
- Docker sandbox: ✅ Implemented
- Local fallback: ✅ Implemented
- Visualization: ✅ Implemented
- UI integration: ✅ Implemented
- Security limits: ✅ Implemented