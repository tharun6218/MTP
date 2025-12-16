from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
import json

app = Flask(__name__)
CORS(app)

# Initialize models
login_model = None
session_model = None
login_scaler = StandardScaler()
session_scaler = StandardScaler()

# Training data storage (in production, use database)
login_training_data = []
session_training_data = []

def initialize_models():
    """Initialize or load pre-trained models"""
    global login_model, session_model, login_scaler, session_scaler
    
    # Load pre-trained models if they exist
    if os.path.exists('models/login_model.pkl'):
        login_model = joblib.load('models/login_model.pkl')
        print("✅ Loaded pre-trained login model")
    else:
        # Initialize with default parameters
        login_model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        # Train with synthetic initial data
        train_login_model_with_synthetic_data()
        print("📝 Initialized and trained new login model")
    
    if os.path.exists('models/session_model.pkl'):
        session_model = joblib.load('models/session_model.pkl')
        print("✅ Loaded pre-trained session model")
    else:
        session_model = IsolationForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        # Train with synthetic initial data
        train_session_model_with_synthetic_data()
        print("📝 Initialized and trained new session model")

def train_login_model_with_synthetic_data():
    """Train login model with synthetic data for immediate use"""
    global login_model, login_scaler
    
    # Generate synthetic training data (normal login patterns)
    np.random.seed(42)
    n_samples = 50
    
    # Normal patterns: mostly 0s for new device/location, low failed attempts
    synthetic_data = np.array([
        [
            np.random.choice([0, 1], p=[0.8, 0.2]),  # isNewDevice
            np.random.choice([0, 1], p=[0.8, 0.2]),  # isNewLocation
            np.random.choice([0, 1], p=[0.7, 0.3]),  # isOddHour
            np.random.randint(0, 2),  # recentFailedAttempts
            np.random.uniform(0, 30),  # daysSinceLastLogin
            np.random.uniform(0.5, 1.0),  # ipReputation
            np.random.choice([0, 1], p=[0.9, 0.1])  # geoVelocity
        ]
        for _ in range(n_samples)
    ])
    
    # Fit scaler and model
    login_scaler.fit(synthetic_data)
    synthetic_data_scaled = login_scaler.transform(synthetic_data)
    login_model.fit(synthetic_data_scaled)
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    joblib.dump(login_model, 'models/login_model.pkl')

def train_session_model_with_synthetic_data():
    """Train session model with synthetic data for immediate use"""
    global session_model, session_scaler
    
    # Generate synthetic training data (normal session patterns)
    np.random.seed(42)
    n_samples = 50
    
    # Normal patterns: low request rates, few errors, no IP changes
    synthetic_data = np.array([
        [
            np.random.uniform(0, 20),  # requestsPerMinute
            np.random.randint(1, 10),  # uniqueEndpoints
            np.random.uniform(0, 0.1),  # errorRate
            np.random.randint(0, 1),  # ipChanges
            np.random.uniform(0, 120),  # sessionDuration (minutes)
            np.random.choice([0, 1], p=[0.95, 0.05])  # userAgentChanges
        ]
        for _ in range(n_samples)
    ])
    
    # Fit scaler and model
    session_scaler.fit(synthetic_data)
    synthetic_data_scaled = session_scaler.transform(synthetic_data)
    session_model.fit(synthetic_data_scaled)
    
    # Save the model
    os.makedirs('models', exist_ok=True)
    joblib.dump(session_model, 'models/session_model.pkl')

def calculate_risk_score(anomaly_score):
    """
    Convert Isolation Forest anomaly score (-1 to 1) to risk score (0 to 100)
    -1 = normal, 1 = highly anomalous
    """
    # Isolation Forest returns -1 for normal, 1 for anomalies
    # Convert to 0-100 scale
    risk_score = ((anomaly_score + 1) / 2) * 100
    return min(max(risk_score, 0), 100)

@app.route('/api/predict/login', methods=['POST'])
def predict_login_risk():
    """Predict risk score for login attempt"""
    try:
        data = request.json
        features = data.get('features', {})
        
        # Extract feature vector
        feature_vector = np.array([[
            features.get('isNewDevice', 0),
            features.get('isNewLocation', 0),
            features.get('isOddHour', 0),
            features.get('recentFailedAttempts', 0),
            features.get('daysSinceLastLogin', 30),
            features.get('ipReputation', 0.5),
            features.get('geoVelocity', 0)
        ]])
        
        # Ensure model is initialized
        if login_model is None:
            initialize_models()
        
        # Scale features (use transform, not fit_transform, to avoid refitting)
        if not hasattr(login_scaler, 'mean_') or login_scaler.mean_ is None:
            # Scaler not fitted yet, fit with current data
            login_scaler.fit(feature_vector)
        feature_vector_scaled = login_scaler.transform(feature_vector)
        
        # Check if model is fitted
        if not hasattr(login_model, 'estimators_') or login_model.estimators_ is None:
            # Model not fitted, train with synthetic data
            train_login_model_with_synthetic_data()
        
        # Predict anomaly score
        anomaly_score = login_model.decision_function(feature_vector_scaled)[0]
        risk_score = calculate_risk_score(anomaly_score)
        
        # Store for training (in production, use proper data pipeline)
        login_training_data.append({
            'features': feature_vector[0].tolist(),
            'risk_score': risk_score
        })
        
        return jsonify({
            'riskScore': float(risk_score),
            'anomalyScore': float(anomaly_score),
            'isAnomaly': bool(anomaly_score > 0.1)
        })
    
    except Exception as e:
        print(f"Error in login prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict/session', methods=['POST'])
def predict_session_risk():
    """Predict risk score for session activity"""
    try:
        data = request.json
        features = data.get('features', {})
        
        # Extract feature vector
        feature_vector = np.array([[
            features.get('requestsPerMinute', 0),
            features.get('uniqueEndpoints', 0),
            features.get('errorRate', 0),
            features.get('ipChanges', 0),
            features.get('sessionDuration', 0),
            features.get('userAgentChanges', 0)
        ]])
        
        # Ensure model is initialized
        if session_model is None:
            initialize_models()
        
        # Scale features (use transform, not fit_transform, to avoid refitting)
        if not hasattr(session_scaler, 'mean_') or session_scaler.mean_ is None:
            # Scaler not fitted yet, fit with current data
            session_scaler.fit(feature_vector)
        feature_vector_scaled = session_scaler.transform(feature_vector)
        
        # Check if model is fitted
        if not hasattr(session_model, 'estimators_') or session_model.estimators_ is None:
            # Model not fitted, train with synthetic data
            train_session_model_with_synthetic_data()
        
        # Predict anomaly score
        anomaly_score = session_model.decision_function(feature_vector_scaled)[0]
        risk_score = calculate_risk_score(anomaly_score)
        
        # Store for training
        session_training_data.append({
            'features': feature_vector[0].tolist(),
            'risk_score': risk_score
        })
        
        return jsonify({
            'riskScore': float(risk_score),
            'anomalyScore': float(anomaly_score),
            'isAnomaly': bool(anomaly_score > 0.1)
        })
    
    except Exception as e:
        print(f"Error in session prediction: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/train', methods=['POST'])
def train_models():
    """Train models with collected data"""
    try:
        global login_model, session_model
        
        # In production, load training data from database
        if len(login_training_data) < 10:
            return jsonify({
                'message': 'Insufficient training data',
                'login_samples': len(login_training_data),
                'session_samples': len(session_training_data)
            }), 400
        
        # Train login model
        login_X = np.array([item['features'] for item in login_training_data])
        login_scaler.fit(login_X)
        login_X_scaled = login_scaler.transform(login_X)
        login_model.fit(login_X_scaled)
        
        # Train session model
        if len(session_training_data) >= 10:
            session_X = np.array([item['features'] for item in session_training_data])
            session_scaler.fit(session_X)
            session_X_scaled = session_scaler.transform(session_X)
            session_model.fit(session_X_scaled)
        
        # Save models
        os.makedirs('models', exist_ok=True)
        joblib.dump(login_model, 'models/login_model.pkl')
        joblib.dump(session_model, 'models/session_model.pkl')
        
        return jsonify({
            'message': 'Models trained successfully',
            'login_samples': len(login_training_data),
            'session_samples': len(session_training_data)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'login_model_loaded': login_model is not None,
        'session_model_loaded': session_model is not None
    })

if __name__ == '__main__':
    initialize_models()
    app.run(host='0.0.0.0', port=5001, debug=True)




