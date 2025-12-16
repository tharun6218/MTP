from setuptools import setup, find_packages

setup(
    name="adaptive-auth-ml",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "flask==3.0.0",
        "flask-cors==4.0.0",
        "numpy>=1.24.0,<2.0.0",
        "scikit-learn>=1.3.0,<2.0.0",
        "joblib>=1.3.0,<2.0.0",
        "pandas>=2.0.0,<3.0.0",
    ],
    python_requires=">=3.10,<3.11",
)

