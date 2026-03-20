from flask import Blueprint, jsonify, session
from models import db, User, Like

discover_bp = Blueprint('discover', __name__)

@discover_bp.route('/', methods=['GET'])
def get_profiles():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    # Récupère les IDs déjà likés
    liked_ids = [l.liked_user_id for l in Like.query.filter_by(user_id=user_id).all()]

    # Retourne tous les autres utilisateurs sauf soi-même et déjà likés
    users = User.query.filter(
        User.id != user_id,
        ~User.id.in_(liked_ids)
    ).all()

    return jsonify({'users': [u.to_dict() for u in users]}), 200