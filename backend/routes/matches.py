from flask import Blueprint, jsonify, request, session
from models import db, Like, Match, User

matches_bp = Blueprint('matches', __name__)


@matches_bp.route('/like', methods=['POST'])
def like_user():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    data = request.get_json()
    liked_user_id = data.get('liked_user_id')
    if not liked_user_id:
        return jsonify({'error': 'liked_user_id requis'}), 400

    # Vérifie que l'utilisateur cible existe
    if not User.query.get(int(liked_user_id)):
        return jsonify({'error': 'Utilisateur introuvable'}), 404

    # Vérif si déjà liké
    existing = Like.query.filter_by(user_id=user_id, liked_user_id=liked_user_id).first()
    if existing:
        return jsonify({'message': 'Déjà liké', 'matched': False}), 200

    # Créer le like
    like = Like(user_id=int(user_id), liked_user_id=int(liked_user_id))
    db.session.add(like)

    # Vérif si match mutuel
    mutual = Like.query.filter_by(user_id=liked_user_id, liked_user_id=user_id).first()
    matched = False
    if mutual:
        # Vérifie qu'un match n'existe pas déjà dans les deux sens
        existing_match = Match.query.filter(
            ((Match.user_1_id == int(user_id)) & (Match.user_2_id == int(liked_user_id))) |
            ((Match.user_1_id == int(liked_user_id)) & (Match.user_2_id == int(user_id)))
        ).first()
        if not existing_match:
            match = Match(user_1_id=int(user_id), user_2_id=int(liked_user_id))
            db.session.add(match)
            matched = True

    db.session.commit()
    return jsonify({'message': 'Like enregistré', 'matched': matched}), 201


@matches_bp.route('/', methods=['GET'])
def get_matches():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    matches = Match.query.filter(
        (Match.user_1_id == int(user_id)) | (Match.user_2_id == int(user_id))
    ).all()

    result = []
    for m in matches:
        other_id = m.user_2_id if m.user_1_id == int(user_id) else m.user_1_id
        other = User.query.get(other_id)
        if other:
            result.append(other.to_dict())

    return jsonify({'matches': result}), 200