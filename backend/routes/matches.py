from flask import Blueprint, jsonify, request, session
from models import db, Like, Match, User

matches_bp = Blueprint('matches', __name__)

@matches_bp.route('/like', methods=['POST'])
def like_user():
    data = request.get_json()
    user_id = session.get('_user_id')

    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    liked_user_id = data.get('liked_user_id')
    if not liked_user_id:
        return jsonify({'error': 'liked_user_id requis'}), 400

    # Vérif si déjà liké
    existing = Like.query.filter_by(user_id=user_id, liked_user_id=liked_user_id).first()
    if existing:
        return jsonify({'message': 'Déjà liké'}), 200

    # Créer le like
    like = Like(user_id=user_id, liked_user_id=liked_user_id)
    db.session.add(like)

    # Vérif si match mutuel
    mutual = Like.query.filter_by(user_id=liked_user_id, liked_user_id=user_id).first()
    matched = False
    if mutual:
        match = Match(user_1_id=user_id, user_2_id=liked_user_id)
        db.session.add(match)
        matched = True

    db.session.commit()
    return jsonify({'message': 'Like enregistré', 'matched': matched}), 201