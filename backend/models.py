from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import bleach
 
db = SQLAlchemy()
 
# Balises HTML autorisées dans la bio (aucune)
ALLOWED_TAGS = []
ALLOWED_ATTRIBUTES = {}
 
 
def sanitize(value):
    """Échappe tout HTML dans une chaîne."""
    if not value:
        return value
    return bleach.clean(str(value), tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES, strip=True)
 
 
class User(UserMixin, db.Model):
    __tablename__ = 'users'
 
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
 
    # Profil
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    bio = db.Column(db.Text)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(50))
    looking_for = db.Column(db.String(50))
    location = db.Column(db.String(200))
    tags = db.Column(db.String(500))
 
    # Photos
    profile_photo = db.Column(db.String(500))
    photos = db.relationship('Photo', backref='user', lazy=True, cascade='all, delete-orphan')
 
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
 
    # Relations
    likes_sent = db.relationship(
        'Like', foreign_keys='Like.user_id',
        backref='liker', lazy=True, cascade='all, delete-orphan'
    )
    likes_received = db.relationship(
        'Like', foreign_keys='Like.liked_user_id',
        backref='liked_by', lazy=True
    )
    matches = db.relationship(
        'Match', foreign_keys='Match.user_1_id',
        backref='user_1', lazy=True, cascade='all, delete-orphan'
    )
    matched_with = db.relationship(
        'Match', foreign_keys='Match.user_2_id',
        backref='user_2', lazy=True
    )
    messages_sent = db.relationship(
        'Message', foreign_keys='Message.sender_id',
        backref='sender', lazy=True, cascade='all, delete-orphan'
    )
    messages_received = db.relationship(
        'Message', foreign_keys='Message.receiver_id',
        backref='receiver', lazy=True
    )
 
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
 
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
 
    def to_dict(self):
        """Données publiques uniquement — jamais d'email ni de hash."""
        return {
            'id': self.id,
            'username': sanitize(self.username),
            # FIX : la bio est sanitisée côté serveur avant d'être renvoyée
            'bio': sanitize(self.bio),
            'age': self.age,
            'gender': self.gender,
            'looking_for': self.looking_for,
            'profile_photo': self.profile_photo,
            'tags': [sanitize(t) for t in (self.tags.split(',') if self.tags else [])],
            'created_at': self.created_at.isoformat(),
        }
 
    def to_private_dict(self):
        """Données complètes pour le propriétaire du compte uniquement."""
        d = self.to_dict()
        d['email'] = self.email
        d['first_name'] = self.first_name
        d['last_name'] = self.last_name
        d['location'] = self.location
        return d
 
    def __repr__(self):
        return f'<User {self.username}>'
 
 
class Photo(db.Model):
    __tablename__ = 'photos'
 
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    photo_url = db.Column(db.String(500), nullable=False)
    is_primary = db.Column(db.Boolean, default=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
 
 
class Like(db.Model):
    __tablename__ = 'likes'
 
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    liked_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
 
    __table_args__ = (db.UniqueConstraint('user_id', 'liked_user_id', name='unique_like'),)
 
 
class Match(db.Model):
    __tablename__ = 'matches'
 
    id = db.Column(db.Integer, primary_key=True)
    user_1_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    user_2_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    matched_at = db.Column(db.DateTime, default=datetime.utcnow)
 
    __table_args__ = (db.UniqueConstraint('user_1_id', 'user_2_id', name='unique_match'),)
 
 
class Message(db.Model):
    __tablename__ = 'messages'
 
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
 
    def to_dict(self):
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': sanitize(self.content),
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
 