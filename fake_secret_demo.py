# fake_secret_demo.py
# ⚠️ DÉMONSTRATION UNIQUEMENT — Ces secrets sont FAUX et non fonctionnels
# Ce fichier est dans l'allowlist .gitleaks.toml → ignoré par Gitleaks
# Objectif : montrer qu'un outil seul ne suffit pas (d'où TruffleHog en complément)

# Faux token interne Spark → matche la règle custom "spark-internal-token"
# mais ignoré car fichier dans l'allowlist
SPARK_TOKEN = "SPARK_A1B2C3D4E5F6G7H8I9J0K1L2M3N4"

# Faux JWT hardcodé → matche la règle custom "hardcoded-jwt"
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMjM0NX0.fakesignatureXYZ123"

# Fausse Flask SECRET_KEY → matche la règle custom "flask-secret-key"
SECRET_KEY = "super-secret-key-de-demo-uniquement"