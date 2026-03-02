"""
Database utilities for StudyMap backend
Includes functions for database initialization, seeding, and migrations
"""

from app import app, db, User, Syllabus, Subject, Topic, Question, Streak, bcrypt
import json
from datetime import datetime, timedelta
import random


def reset_database():
    """Drop all tables and recreate them"""
    with app.app_context():
        print("⚠️  Dropping all tables...")
        db.drop_all()
        print("✅ All tables dropped")
        
        print("🔨 Creating tables...")
        db.create_all()
        print("✅ Tables created")


def seed_admin_user():
    """Create default admin user"""
    with app.app_context():
        admin = User.query.filter_by(email='admin@studymap.com').first()
        
        if not admin:
            admin = User(
                name='Admin User',
                email='admin@studymap.com',
                password=bcrypt.generate_password_hash('admin123').decode('utf-8'),
                role='admin'
            )
            db.session.add(admin)
            
            # Create streak for admin
            streak = Streak(
                user_id=admin.id,
                current_streak=7,
                longest_streak=14,
                last_activity_date=datetime.utcnow().date(),
                activity_dates=json.dumps([
                    (datetime.utcnow().date() - timedelta(days=i)).isoformat() 
                    for i in range(7)
                ])
            )
            db.session.add(streak)
            
            db.session.commit()
            print("✅ Admin user created")
            print("   Email: admin@studymap.com")
            print("   Password: admin123")
        else:
            print("ℹ️  Admin user already exists")


def seed_test_users():
    """Create test users with sample data"""
    with app.app_context():
        test_users = [
            {
                'name': 'John Student',
                'email': 'john@example.com',
                'password': 'password123'
            },
            {
                'name': 'Jane Learner',
                'email': 'jane@example.com',
                'password': 'password123'
            },
            {
                'name': 'Mike Scholar',
                'email': 'mike@example.com',
                'password': 'password123'
            }
        ]
        
        for user_data in test_users:
            existing = User.query.filter_by(email=user_data['email']).first()
            if not existing:
                user = User(
                    name=user_data['name'],
                    email=user_data['email'],
                    password=bcrypt.generate_password_hash(user_data['password']).decode('utf-8'),
                    role='student'
                )
                db.session.add(user)
                db.session.flush()
                
                # Create streak
                streak = Streak(
                    user_id=user.id,
                    current_streak=random.randint(0, 10),
                    longest_streak=random.randint(5, 20),
                    activity_dates='[]'
                )
                db.session.add(streak)
        
        db.session.commit()
        print(f"✅ Created {len(test_users)} test users")


def seed_sample_syllabus(user_email='admin@studymap.com'):
    """Create a sample syllabus with subjects and topics"""
    with app.app_context():
        user = User.query.filter_by(email=user_email).first()
        
        if not user:
            print(f"❌ User {user_email} not found")
            return
        
        # Check if user already has a syllabus
        existing = Syllabus.query.filter_by(user_id=user.id).first()
        if existing:
            print("ℹ️  User already has a syllabus")
            return
        
        # Create syllabus
        syllabus = Syllabus(
            user_id=user.id,
            name='Computer Science Fundamentals',
            filename='sample_cs_syllabus.pdf',
            filepath='uploads/sample_cs_syllabus.pdf',
            extracted=True
        )
        db.session.add(syllabus)
        db.session.flush()
        
        # Sample subjects and topics
        subjects_data = [
            {
                'name': 'Data Structures',
                'topics': [
                    'Arrays and Linked Lists',
                    'Stacks and Queues',
                    'Trees and Graphs',
                    'Hash Tables',
                    'Heaps and Priority Queues'
                ]
            },
            {
                'name': 'Algorithms',
                'topics': [
                    'Sorting Algorithms',
                    'Searching Algorithms',
                    'Dynamic Programming',
                    'Greedy Algorithms',
                    'Graph Algorithms'
                ]
            },
            {
                'name': 'Database Systems',
                'topics': [
                    'Relational Model',
                    'SQL Fundamentals',
                    'Database Design',
                    'Transactions and Concurrency',
                    'Query Optimization'
                ]
            },
            {
                'name': 'Operating Systems',
                'topics': [
                    'Process Management',
                    'Memory Management',
                    'File Systems',
                    'Concurrency and Synchronization',
                    'Deadlock Handling'
                ]
            }
        ]
        
        for subject_idx, subject_data in enumerate(subjects_data):
            subject = Subject(
                syllabus_id=syllabus.id,
                name=subject_data['name'],
                order_index=subject_idx
            )
            db.session.add(subject)
            db.session.flush()
            
            for topic_idx, topic_name in enumerate(subject_data['topics']):
                topic = Topic(
                    subject_id=subject.id,
                    name=topic_name,
                    status='pending',
                    order_index=topic_idx
                )
                db.session.add(topic)
                db.session.flush()
                
                # Generate questions for topic
                questions_data = [
                    {
                        'question': f'What is the primary concept of {topic_name}?',
                        'options': [
                            f'Basic principle of {topic_name}',
                            f'Advanced application',
                            f'Historical context',
                            f'Future implications'
                        ],
                        'correct_answer': 0
                    },
                    {
                        'question': f'Which statement best describes {topic_name}?',
                        'options': [
                            'First definition',
                            'Second definition',
                            'Third definition',
                            'Fourth definition'
                        ],
                        'correct_answer': 1
                    },
                    {
                        'question': f'What are the key components of {topic_name}?',
                        'options': [
                            'Component A and B',
                            'Component C and D',
                            'Component E and F',
                            'All of the above'
                        ],
                        'correct_answer': 3
                    },
                    {
                        'question': f'How does {topic_name} relate to practical applications?',
                        'options': [
                            'Through direct implementation',
                            'Through theoretical framework',
                            'Through empirical evidence',
                            'Through case studies'
                        ],
                        'correct_answer': 0
                    },
                    {
                        'question': f'What is the significance of {topic_name}?',
                        'options': [
                            'It forms the foundation',
                            'It provides practical tools',
                            'It offers theoretical insights',
                            'All of the above'
                        ],
                        'correct_answer': 3
                    }
                ]
                
                for question_data in questions_data:
                    question = Question(
                        topic_id=topic.id,
                        question=question_data['question'],
                        options=json.dumps(question_data['options']),
                        correct_answer=question_data['correct_answer']
                    )
                    db.session.add(question)
        
        db.session.commit()
        print(f"✅ Created sample syllabus for {user.name}")
        print(f"   - {len(subjects_data)} subjects")
        total_topics = sum(len(s['topics']) for s in subjects_data)
        print(f"   - {total_topics} topics")
        print(f"   - {total_topics * 5} questions")


def init_full_database():
    """Initialize database with all seed data"""
    print("\n" + "=" * 60)
    print("Initializing StudyMap Database")
    print("=" * 60 + "\n")
    
    reset_database()
    print()
    
    seed_admin_user()
    print()
    
    seed_test_users()
    print()
    
    seed_sample_syllabus('admin@studymap.com')
    print()
    
    print("=" * 60)
    print("✅ Database initialization complete!")
    print("=" * 60)


if __name__ == '__main__':
    init_full_database()
