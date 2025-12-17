from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
import os
import json
import sys

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
    if os.path.exists('models/login_model.pkl') and os.path.exists('models/login_scaler.pkl'):
        login_model = joblib.load('models/login_model.pkl')
        login_scaler = joblib.load('models/login_scaler.pkl')
        print("✅ Loaded pre-trained login model and scaler")
    else:
        # Initialize with optimized parameters for better detection
        login_model = IsolationForest(
            contamination=0.15,  # Expect 15% anomalies (more sensitive)
            random_state=42,
            n_estimators=150,  # More trees for better accuracy
            max_samples='auto',
            max_features=1.0,
            bootstrap=False
        )
        # Train with synthetic initial data
        train_login_model_with_synthetic_data()
        print("📝 Initialized and trained new login model")
    
    if os.path.exists('models/session_model.pkl') and os.path.exists('models/session_scaler.pkl'):
        session_model = joblib.load('models/session_model.pkl')
        session_scaler = joblib.load('models/session_scaler.pkl')
        print("✅ Loaded pre-trained session model and scaler")
    else:
        # Initialize with optimized parameters for better detection
        session_model = IsolationForest(
            contamination=0.15,  # Expect 15% anomalies (more sensitive)
            random_state=42,
            n_estimators=150,  # More trees for better accuracy
            max_samples='auto',
            max_features=1.0,
            bootstrap=False
        )
        # Train with synthetic initial data
        train_session_model_with_synthetic_data()
        print("📝 Initialized and trained new session model")

def train_login_model_with_synthetic_data():
    """Train login model with synthetic data for immediate use - Enhanced with better patterns"""
    global login_model, login_scaler
    
    # Generate more diverse synthetic training data
    np.random.seed(42)
    n_samples = 200  # Increased from 50 to 200 for better model
    
    # Normal patterns (80% of data) - legitimate logins
    normal_data = np.array([
        [
            np.random.choice([0, 1], p=[0.85, 0.15]),  # isNewDevice (mostly known devices)
            np.random.choice([0, 1], p=[0.9, 0.1]),  # isNewLocation (mostly known locations)
            np.random.choice([0, 1], p=[0.75, 0.25]),  # isOddHour (mostly normal hours)
            np.random.randint(0, 1),  # recentFailedAttempts (0-1)
            np.random.uniform(0, 7),  # daysSinceLastLogin (recent logins)
            np.random.uniform(0.6, 1.0),  # ipReputation (good reputation)
            np.random.choice([0, 1], p=[0.95, 0.05])  # geoVelocity (no impossible travel)
        ]
        for _ in range(int(n_samples * 0.8))
    ])
    
    # Anomalous patterns (20% of data) - suspicious logins
    anomalous_data = np.array([
        [
            np.random.choice([0, 1], p=[0.3, 0.7]),  # isNewDevice (mostly new)
            np.random.choice([0, 1], p=[0.4, 0.6]),  # isNewLocation (mostly new)
            np.random.choice([0, 1], p=[0.4, 0.6]),  # isOddHour (suspicious hours)
            np.random.randint(2, 5),  # recentFailedAttempts (multiple failures)
            np.random.uniform(30, 365),  # daysSinceLastLogin (long time)
            np.random.uniform(0.0, 0.4),  # ipReputation (poor reputation)
            np.random.choice([0, 1], p=[0.5, 0.5])  # geoVelocity (possible travel)
        ]
        for _ in range(int(n_samples * 0.2))
    ])
    
    # Combine normal and anomalous data
    synthetic_data = np.vstack([normal_data, anomalous_data])
    
    # Fit scaler and model
    login_scaler.fit(synthetic_data)
    synthetic_data_scaled = login_scaler.transform(synthetic_data)
    login_model.fit(synthetic_data_scaled)
    
    # Save the model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(login_model, 'models/login_model.pkl')
    joblib.dump(login_scaler, 'models/login_scaler.pkl')
    print(f"✅ Trained login model with {n_samples} synthetic samples")

def train_session_model_with_synthetic_data():
    """Train session model with synthetic data for immediate use - Enhanced with better patterns"""
    global session_model, session_scaler
    
    # Generate more diverse synthetic training data
    np.random.seed(42)
    n_samples = 200  # Increased from 50 to 200 for better model
    
    # Normal patterns (80% of data) - legitimate sessions
    normal_data = np.array([
        [
            np.random.uniform(1, 15),  # requestsPerMinute (normal browsing)
            np.random.randint(2, 8),  # uniqueEndpoints (normal navigation)
            np.random.uniform(0, 0.05),  # errorRate (very low errors)
            0,  # ipChanges (no IP changes for normal sessions)
            np.random.uniform(5, 60),  # sessionDuration (normal session length)
            np.random.choice([0, 1], p=[0.98, 0.02])  # userAgentChanges (rare)
        ]
        for _ in range(int(n_samples * 0.8))
    ])
    
    # Anomalous patterns (20% of data) - suspicious sessions
    anomalous_data = np.array([
        [
            np.random.uniform(30, 100),  # requestsPerMinute (very high - bot-like)
            np.random.randint(15, 50),  # uniqueEndpoints (scanning many endpoints)
            np.random.uniform(0.2, 0.8),  # errorRate (high error rate)
            np.random.randint(1, 5),  # ipChanges (multiple IP changes)
            np.random.uniform(0, 5),  # sessionDuration (very short - suspicious)
            np.random.choice([0, 1], p=[0.3, 0.7])  # userAgentChanges (frequent changes)
        ]
        for _ in range(int(n_samples * 0.2))
    ])
    
    # Combine normal and anomalous data
    synthetic_data = np.vstack([normal_data, anomalous_data])
    
    # Fit scaler and model
    session_scaler.fit(synthetic_data)
    synthetic_data_scaled = session_scaler.transform(synthetic_data)
    session_model.fit(synthetic_data_scaled)
    
    # Save the model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(session_model, 'models/session_model.pkl')
    joblib.dump(session_scaler, 'models/session_scaler.pkl')
    print(f"✅ Trained session model with {n_samples} synthetic samples")

def calculate_risk_score(anomaly_score, feature_weights=None):
    """
    Convert Isolation Forest anomaly score to risk score (0 to 100)
    Enhanced with feature-based weighting for more accurate risk assessment
    
    Isolation Forest returns:
    - Negative values: normal behavior (closer to -1 = more normal)
    - Positive values: anomalous behavior (closer to 1 = more anomalous)
    """
    # Base conversion: map [-1, 1] to [0, 100]
    base_score = ((anomaly_score + 1) / 2) * 100
    
    # Apply non-linear scaling for better risk distribution
    # Low anomalies get lower scores, high anomalies get amplified
    if anomaly_score < 0:
        # Normal behavior: compress to lower range (0-40)
        risk_score = base_score * 0.4
    elif anomaly_score < 0.1:
        # Slightly anomalous: moderate risk (40-60)
        risk_score = 40 + (base_score - 50) * 0.4
    elif anomaly_score < 0.3:
        # Moderately anomalous: higher risk (60-80)
        risk_score = 60 + (base_score - 55) * 0.67
    else:
        # Highly anomalous: maximum risk (80-100)
        risk_score = 80 + (base_score - 65) * 0.67
    
    # Apply feature weights if provided (for future enhancement)
    if feature_weights:
        weighted_adjustment = sum(feature_weights.values()) / len(feature_weights)
        risk_score = risk_score * (0.7 + 0.3 * weighted_adjustment)
    
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
        
        # Enhanced risk calculation with feature analysis
        risk_score = calculate_risk_score(anomaly_score)
        
        # Additional risk factors (rule-based enhancement)
        additional_risk = 0
        if features.get('isNewDevice', 0) == 1:
            additional_risk += 15
        if features.get('isNewLocation', 0) == 1:
            additional_risk += 12
        if features.get('recentFailedAttempts', 0) >= 3:
            additional_risk += 20
        if features.get('ipReputation', 0.5) < 0.3:
            additional_risk += 15
        if features.get('geoVelocity', 0) == 1:
            additional_risk += 25  # Impossible travel is high risk
        
        # Combine ML and rule-based scores (weighted average)
        final_risk_score = min(risk_score * 0.7 + additional_risk * 0.3, 100)
        
        # Determine if anomaly (more sensitive threshold)
        is_anomaly = anomaly_score > 0.05 or final_risk_score > 50
        
        # Store for training (in production, use proper data pipeline)
        login_training_data.append({
            'features': feature_vector[0].tolist(),
            'risk_score': final_risk_score,
            'anomaly_score': float(anomaly_score)
        })
        
        return jsonify({
            'riskScore': float(final_risk_score),
            'anomalyScore': float(anomaly_score),
            'isAnomaly': bool(is_anomaly),
            'riskLevel': 'high' if final_risk_score > 70 else 'medium' if final_risk_score > 40 else 'low'
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
        
        # Enhanced risk calculation
        risk_score = calculate_risk_score(anomaly_score)
        
        # Additional risk factors (rule-based enhancement)
        additional_risk = 0
        if features.get('requestsPerMinute', 0) > 50:
            additional_risk += 20  # Bot-like behavior
        if features.get('ipChanges', 0) > 0:
            additional_risk += 30  # IP change is very suspicious
        if features.get('errorRate', 0) > 0.3:
            additional_risk += 15  # High error rate
        if features.get('userAgentChanges', 0) == 1:
            additional_risk += 20  # User agent change
        if features.get('uniqueEndpoints', 0) > 20:
            additional_risk += 15  # Scanning many endpoints
        
        # Combine ML and rule-based scores (weighted average)
        final_risk_score = min(risk_score * 0.65 + additional_risk * 0.35, 100)
        
        # Determine if anomaly (more sensitive threshold)
        is_anomaly = anomaly_score > 0.05 or final_risk_score > 60
        
        # Store for training
        session_training_data.append({
            'features': feature_vector[0].tolist(),
            'risk_score': final_risk_score,
            'anomaly_score': float(anomaly_score)
        })
        
        return jsonify({
            'riskScore': float(final_risk_score),
            'anomalyScore': float(anomaly_score),
            'isAnomaly': bool(is_anomaly),
            'riskLevel': 'high' if final_risk_score > 70 else 'medium' if final_risk_score > 50 else 'low'
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

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        'message': 'ML Service for Adaptive Authentication',
        'status': 'running',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'predict_login': '/api/predict/login',
            'predict_session': '/api/predict/session',
            'train': '/api/train'
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'login_model_loaded': login_model is not None,
        'session_model_loaded': session_model is not None,
        'python_version': sys.version.split()[0]
    })

if __name__ == '__main__':
    initialize_models()
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)




