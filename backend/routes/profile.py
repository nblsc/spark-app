from flask import Blueprint, request, jsonify, session
from models import db, User, sanitize

profile_bp = Blueprint('profile', __name__)

MAX_BIO_LENGTH = 500
MAX_TAGS = 10


@profile_bp.route('/update', methods=['PUT'])
def update_profile():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Données manquantes'}), 400

    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    if 'bio' in data:
        bio = str(data['bio'])[:MAX_BIO_LENGTH]
        # FIX : on sanitise la bio à l'écriture pour tuer le XSS stocké
        user.bio = sanitize(bio)

    if 'age' in data:
        try:
            age = int(data['age'])
            if not (18 <= age <= 99):
                return jsonify({'error': "L'âge doit être entre 18 et 99"}), 400
            user.age = age
        except (ValueError, TypeError):
            return jsonify({'error': 'Âge invalide'}), 400

    if 'email' in data:
        email = str(data['email']).strip().lower()
        existing = User.query.filter_by(email=email).first()
        if existing and existing.id != user.id:
            return jsonify({'error': 'Cet email est déjà utilisé'}), 409
        user.email = email

    if 'profile_photo' in data:
        photo = str(data['profile_photo'])
        # On n'accepte que les data-URI image ou les URLs https
        if photo.startswith('data:image/') or photo.startswith('https://'):
            user.profile_photo = photo
        else:
            return jsonify({'error': 'Format de photo invalide'}), 400

    if 'tags' in data:
        tags = data['tags']
        if isinstance(tags, list):
            tags = [sanitize(str(t).strip()) for t in tags[:MAX_TAGS]]
            user.tags = ','.join(t for t in tags if t)
        else:
            user.tags = sanitize(str(tags))

    db.session.commit()
    return jsonify({'message': 'Profil mis à jour', 'user': user.to_private_dict()}), 200


@profile_bp.route('/me', methods=['GET'])
def get_profile():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    return jsonify({'user': user.to_private_dict()}), 200
    