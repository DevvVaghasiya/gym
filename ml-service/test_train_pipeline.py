import os
import sys
import unittest

ROOT = os.path.dirname(os.path.abspath(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import train


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


if __name__ == '__main__':
    unittest.main()
