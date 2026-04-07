from flask import Blueprint, jsonify, request, session
from models import db, Message

messages_bp = Blueprint('messages', __name__)


@messages_bp.route('/send', methods=['POST'])
def send_message():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    data = request.get_json()
    receiver_id = data.get('receiver_id')
    content = data.get('content')

    if not receiver_id or not content:
        return jsonify({'error': 'receiver_id et content sont requis'}), 400

    message = Message(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=content
    )
    db.session.add(message)
    db.session.commit()

    return jsonify({'message': 'Message envoyé', 'data': message.to_dict()}), 201


@messages_bp.route('/', methods=['GET'])
def get_messages():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'error': 'Non connecté'}), 401

    messages = Message.query.filter(
        (Message.sender_id == user_id) | (Message.receiver_id == user_id)
    ).order_by(Message.created_at.desc()).all()

    return jsonify({'messages': [m.to_dict() for m in messages]}), 200


@messages_bp.route('/unread', methods=['GET'])
def get_unread_count():
    user_id = session.get('_user_id')
    if not user_id:
        return jsonify({'count': 0}), 200

    count = Message.query.filter_by(receiver_id=user_id, is_read=False).count()
    return jsonify({'count': count}), 200
    