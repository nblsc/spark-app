from flask import Blueprint, jsonify, session
from models import User, Like

discover_bp = Blueprint('discover', __name__)


@discover_bp.route('/', methods=['GET'])
def get_profiles():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    user_id = int(user_id)

    liked_ids = [like.liked_user_id for like in Like.query.filter_by(user_id=user_id).all()]

    users = User.query.filter(
        User.id != user_id,
        ~User.id.in_(liked_ids)
    ).all()

    # FIX : to_dict() retourne uniquement les champs publics (sans email, sans hash).
    # La sanitisation XSS de la bio est faite dans to_dict() via bleach.
    return jsonify({'users': [u.to_dict() for u in users]}), 200
    