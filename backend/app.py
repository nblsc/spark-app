import os
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template
from flask_login import LoginManager
from flask_cors import CORS
from config import DevelopmentConfig
from models import db, User

load_dotenv()

def create_app(config_name='development'):
    app = Flask(__name__,
                template_folder='../frontend/templates',
                static_folder='../frontend/static')

    env = os.getenv('FLASK_ENV', 'development')
    if env == 'production':
        from config import ProductionConfig
        app.config.from_object(ProductionConfig)
    else:
        app.config.from_object(DevelopmentConfig)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    with app.app_context():
        db.create_all()

    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'OK', 'message': 'Backend is running!'}), 200

    @app.route('/', methods=['GET'])
    @app.route('/index', methods=['GET'])
    def index():
        return render_template('index.html')

    from routes.auth import auth_bp
    from routes.profile import profile_bp
    from routes.discover import discover_bp
    from routes.matches import matches_bp
    from routes.messages import messages_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(discover_bp, url_prefix='/api/discover')
    app.register_blueprint(matches_bp, url_prefix='/api/matches')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)