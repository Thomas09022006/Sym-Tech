"""
WSGI entry point for production deployment (Render / Gunicorn).
"""
import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from backend.app import create_app

app = create_app()
