import os
import sys
import json
import unittest

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import train
from engines.rag import answer as answer_coach_question, retrieve


class TrainPipelineTests(unittest.TestCase):
    def test_signup_dataset_is_loaded(self):
        df = train.load_signup_dataset()
        self.assertIn('workout_split', df.columns)
        self.assertIn('protein_g', df.columns)
        self.assertGreater(len(df), 10)

    def test_feature_mapping_works_for_signups(self):
        row = {
            'age': 28,
            'gender': 'Male',
            'heightCm': 176,
            'weightKg': 74,
            'bodyFatPercent': 18,
            'activityLevel': 'moderate',
            'experience': 'intermediate',
            'goal': 'muscle_gain',
            'daysPerWeek': 4,
            'dietPreference': 'vegetarian',
        }
        features = train.signup_feature_row(row)
        self.assertIn('age', features.columns)
        self.assertEqual(features.loc[0, 'gender'], 1)
        self.assertEqual(features.loc[0, 'goal'], train.goal_code('muscle_gain'))

    def test_split_normalization_keeps_supported_labels(self):
        self.assertIn(train.normalize_split('Push Pull Legs'), {'ppl', 'upper_lower', 'full_body'})
        self.assertIn(train.normalize_split('Upper Lower + Full Body'), {'upper_lower', 'ppl', 'full_body'})

    def test_exercise_tracking_dataset_is_supported(self):
        path = os.path.join(ROOT, '..', 'gym_members_exercise_tracking_synthetic_data.csv')
        if not os.path.exists(path):
            self.skipTest('exercise tracking dataset not found')

        df = train.load_signup_dataset(path)
        self.assertIn('goal', df.columns)
        self.assertIn('strategy', df.columns)
        self.assertIn('split', df.columns)
        self.assertGreater(len(df), 10)

    def test_coach_training_examples_come_from_knowledge_base(self):
        df = train.load_coach_training_data()

        self.assertGreaterEqual(len(df), 40)
        self.assertGreaterEqual(df['intent'].nunique(), 5)
        self.assertGreaterEqual(df['topic'].nunique(), 30)
        self.assertFalse(df['question'].isna().any())

    def test_coach_answers_paraphrased_questions_from_dataset(self):
        result = answer_coach_question(
            'I am stuck at the same reps and weight; what now?', None, None, None
        )

        self.assertEqual(result['intent'], 'exercise_advice')
        self.assertEqual(result['topic'], 'progressive-overload')
        self.assertIn('top of the rep range', result['answer'])

    def test_coach_prefers_specific_article_for_shared_intent(self):
        result = answer_coach_question('When should I take a deload week?', None, None, None)

        self.assertEqual(result['intent'], 'recovery_advice')
        self.assertEqual(result['topic'], 'deload')
        self.assertIn('short period of reduced training stress', result['answer'])
        self.assertIn('Deload weeks and fatigue management', result['sources'])

    def test_coach_metadata_and_misspelling_retrieval(self):
        with open(train.COACH_DATASET, encoding='utf-8') as file:
            docs = json.load(file)['docs']

        required = {'topic', 'category', 'follow_up_questions', 'related_topics', 'source', 'safety_level', 'answer_type'}
        self.assertTrue(all(required.issubset(doc) for doc in docs))
        result = answer_coach_question('What proteen targt should I use?', None, None, None)
        self.assertEqual(result['topic'], 'protein')
        self.assertTrue(result['followUpQuestions'])
        self.assertIn('current weight', result['answer'].lower())

    def test_coach_personalizes_protein_without_diet_plan(self):
        profile = {'weightKg': 75, 'goal': 'muscle_gain', 'experience': 'intermediate', 'daysPerWeek': 4, 'foodPreference': 'vegetarian'}
        result = answer_coach_question('How much protein should I eat?', profile, None, None)

        self.assertIn('120-165 g/day', result['answer'])
        self.assertIn('75 kg', result['answer'])
        self.assertIn('soya chunks', result['answer'])
        self.assertTrue(result['usedPlanData'])

    def test_coach_asks_for_missing_profile_details(self):
        result = answer_coach_question('How much protein should I eat?', None, None, None)

        self.assertIn('current weight', result['answer'].lower())
        self.assertGreaterEqual(len(result['followUpQuestions']), 2)

    def test_coach_uses_details_from_follow_up_reply(self):
        history = [
            {'role': 'user', 'content': 'How much protein should I eat?'},
            {'role': 'assistant', 'content': 'What is your current weight, and is your main goal muscle gain, fat loss, or maintenance? What food preference should I use?'},
        ]
        result = answer_coach_question('75 kg, muscle gain, vegetarian', None, None, None, history=history)

        self.assertEqual(result['topic'], 'protein')
        self.assertIn('120-165 g/day', result['answer'])
        self.assertIn('soya chunks', result['answer'])

    def test_coach_retains_context_for_short_follow_up(self):
        history = [{'role': 'user', 'content': 'I missed my leg workout today. What should I do?'}]
        result = answer_coach_question('What about tomorrow?', {'daysPerWeek': 4}, None, None, history=history)

        self.assertEqual(result['topic'], 'missed-workout')
        self.assertIn('tomorrow', result['answer'].lower())
        self.assertIn("Don't stack two hard sessions", result['answer'])

    def test_coach_uses_urgent_safety_response(self):
        result = answer_coach_question('I have chest pain while lifting. Can I finish my sets?', None, None, None)

        self.assertEqual(result['intent'], 'safety')
        self.assertIn('urgent medical care', result['answer'].lower())
        self.assertIn('do not continue', result['answer'].lower())

    def test_coach_routes_self_harm_to_crisis_support(self):
        result = answer_coach_question('I want to hurt myself.', None, None, None)

        self.assertEqual(result['intent'], 'safety')
        self.assertIn('local emergency number', result['answer'].lower())

    def test_retrieval_quality_benchmark(self):
        cases = [
            ('What proteen target should I use?', 'protein'),
            ('I missed leg day; should I double tomorrow?', 'missed-workout'),
            ('Can tofu replace chicken in my meal?', 'food-subs-veg'),
            ('How do I fit lifting into a 30 minute schedule?', 'time-efficient-workouts'),
            ('How many days off should I take when my legs feel tired?', 'rest-days'),
            ('How much creatin should I take each day?', 'supplements'),
        ]
        correct = sum(bool(retrieve(question)) and retrieve(question)[0]['id'] == expected for question, expected in cases)
        self.assertGreaterEqual(correct / len(cases), 0.8)

    def test_all_coach_examples_retrieve_their_topic(self):
        with open(train.COACH_DATASET, encoding='utf-8') as file:
            docs = json.load(file)['docs']

        for doc in docs:
            for question in doc['questions']:
                with self.subTest(question=question):
                    retrieved_ids = [item['id'] for item in retrieve(question)]
                    self.assertIn(doc['id'], retrieved_ids)


if __name__ == '__main__':
    unittest.main()
