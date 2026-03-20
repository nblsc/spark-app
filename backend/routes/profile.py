from flask import Blueprint, jsonify, request, session
from models import db, User

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/update', methods=['PUT'])
def update_profile():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    data = request.get_json()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    if 'bio' in data:
        user.bio = data['bio']
    if 'age' in data:
        user.age = data['age']
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user.id:
            return jsonify({'error': 'Cet email est déjà utilisé'}), 409
        user.email = data['email']
    if 'profile_photo' in data:
        user.profile_photo = data['profile_photo']
    if 'tags' in data:
        user.tags = ','.join(data['tags']) if isinstance(data['tags'], list) else data['tags']

    db.session.commit()
    return jsonify({'message': 'Profil mis à jour', 'user': user.to_dict()}), 200


@profile_bp.route('/me', methods=['GET'])
def get_profile():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    return jsonify({'user': user.to_dict()}), 200