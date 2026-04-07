from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password') or not data.get('username'):
        return jsonify({'error': 'Email, username et password sont requis'}), 400

    # Validation basique longueur/format
    if len(data['password']) < 8:
        return jsonify({'error': 'Le mot de passe doit faire au moins 8 caractères'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Cet email est déjà utilisé'}), 409

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Ce username est déjà pris'}), 409

    tags_data = data.get('tags', [])
    tags_str = ','.join(tags_data) if isinstance(tags_data, list) else (tags_data or '')

    user = User(
        username=data['username'],
        email=data['email'],
        age=data.get('age'),
        bio=data.get('bio', ''),
        tags=tags_str,
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    login_user(user, remember=True)

    # FIX : on retourne to_private_dict() car c'est le propriétaire du compte
    return jsonify({'message': 'Compte créé avec succès', 'user': user.to_private_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email et password sont requis'}), 400

    user = User.query.filter_by(email=data['email']).first()

    # FIX : message générique pour ne pas révéler si l'email existe
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Email ou mot de passe incorrect'}), 401

    login_user(user, remember=True)

    # FIX : to_private_dict() car c'est le propriétaire du compte
    return jsonify({'message': 'Connexion réussie', 'user': user.to_private_dict()}), 200


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Déconnexion réussie'}), 200


@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    return jsonify({'user': current_user.to_private_dict()}), 200
    