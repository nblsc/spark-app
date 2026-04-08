import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Configuration de base."""
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f'sqlite:///{os.path.join(BASE_DIR, "data", "dating_app.db")}'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # FIX : SECRET_KEY doit obligatoirement venir de l'environnement en prod.
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY n'est pas définie. "
            "Ajoutez-la dans votre fichier .env ou vos variables d'environnement."
        )

    SESSION_COOKIE_HTTPONLY = True   # inaccessible depuis JS — bloque le vol via XSS
    SESSION_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_DURATION = timedelta(days=30)
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    JSON_SORT_KEYS = False


class DevelopmentConfig(Config):
    """Config développement."""
    # FIX : DEBUG = False même en dev pour éviter l'exposition de Werkzeug.
    # Utilisez FLASK_DEBUG=1 uniquement en local et jamais accessible publiquement.
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = False  # HTTP ok en local


class ProductionConfig(Config):
    """Config production."""
    DEBUG = False       # FIX : Werkzeug debugger désactivé — était la faille RCE
    TESTING = False
    SESSION_COOKIE_SECURE = True   # HTTPS obligatoire
    SESSION_COOKIE_HTTPONLY = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SECRET_KEY = 'test-secret-key-only'  # Exception autorisée pour les tests
    