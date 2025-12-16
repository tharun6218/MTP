# ML Service for Anomaly Detection

Python Flask service for ML-based risk scoring.

## Setup

```bash
pip install -r requirements.txt
```

## Running the Service

**Important:** Use Python 3.10 (where packages are installed):

```bash
# Windows
py -3.10 app.py

# Or use the startup script
start_ml_service.bat

# Linux/Mac
python3.10 app.py
```

Service runs on `http://localhost:5001`

## Troubleshooting

If you get `ModuleNotFoundError: No module named 'flask'`:

1. **Check Python version:**
   ```bash
   python --version
   ```

2. **Install packages in the correct Python:**
   ```bash
   # If using Python 3.10
   py -3.10 -m pip install -r requirements.txt
   
   # Or install in your default Python 3.12
   python -m pip install -r requirements.txt
   ```

3. **Use the correct Python to run:**
   ```bash
   # Use Python 3.10 (where packages are installed)
   py -3.10 app.py
   ```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/predict/login` - Predict login risk
- `POST /api/predict/session` - Predict session risk
- `POST /api/train` - Train models
