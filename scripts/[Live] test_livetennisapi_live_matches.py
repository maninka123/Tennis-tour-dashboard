#!/usr/bin/env python3
"""Offline checks for the Live Tennis API live-score mapper.

Stdlib only, no network and no API key needed:

    python3 "scripts/[Live] test_livetennisapi_live_matches.py"

The fixtures are shaped to the published OpenAPI spec (Match / Player / Score),
so they exercise the mapping and the documented edge cases without calling the
API. They are not evidence that the live service returns these exact values.
"""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

_SOURCE = Path(__file__).resolve().parent / '[Live] livetennisapi_live_matches.py'
_spec = importlib.util.spec_from_file_location('ltapi_live_matches', _SOURCE)
ltapi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ltapi)


def _match(**overrides):
    base = {
        'id': 990001,
        'tournament': 'Cincinnati Open',
        'surface': 'hard',
        'round': 'QF',
        'status': 'live',
        'is_doubles': False,
        'scheduled_time': '2026-08-03T14:00:00Z',
        'players': {
            'p1': {'id': 501, 'name': 'A Player', 'country': 'USA', 'ranking': 7},
            'p2': {'id': 502, 'name': 'B Player', 'country': 'ESP', 'ranking': 12},
        },
        'score': {
            'sets': [1, 0],
            'games': [[6, 3], [4, 2]],
            'points': ['40', '30'],
            'server': 1,
            'is_tiebreak': False,
        },
    }
    base.update(overrides)
    return base


class TestMapping(unittest.TestCase):

    def test_maps_a_live_singles_match(self):
        out = ltapi.to_dashboard_match(_match(), 'atp')
        self.assertEqual(out['id'], 'ltapi_990001')
        self.assertEqual(out['tour'], 'ATP')
        self.assertEqual(out['tournament'], 'Cincinnati Open')
        self.assertEqual(out['surface'], 'Hard')
        self.assertEqual(out['round'], 'QF')
        self.assertEqual(out['status'], 'live')
        self.assertEqual(out['serving'], 1)
        self.assertEqual(out['score']['sets'], [{'p1': 6, 'p2': 4}, {'p1': 3, 'p2': 2}])
        self.assertEqual(out['score']['current_game'], {'p1': '40', 'p2': '30'})
        self.assertEqual(out['player1'], {'name': 'A Player', 'country': 'USA', 'rank': 7})

    def test_match_id_is_prefixed_and_never_a_bare_number(self):
        # The frontend treats a bare numeric id > 1000 as another provider's id.
        out = ltapi.to_dashboard_match(_match(), 'atp')
        self.assertTrue(out['id'].startswith('ltapi_'))
        self.assertFalse(str(out['id']).isdigit())

    def test_no_player_id_is_emitted(self):
        out = ltapi.to_dashboard_match(_match(), 'wta')
        for side in ('player1', 'player2'):
            self.assertNotIn('id', out[side])
            self.assertNotIn('player_code', out[side])
            self.assertNotIn('image_url', out[side])

    def test_empty_games_array_yields_no_sets(self):
        # A match can carry an empty games array; the score is never synthesised
        # from the set counts.
        out = ltapi.to_dashboard_match(_match(score={'sets': [2, 1], 'games': [], 'points': [None, None]}), 'atp')
        self.assertEqual(out['score']['sets'], [])
        self.assertNotIn('current_game', out['score'])

    def test_null_points_are_dropped_not_defaulted(self):
        out = ltapi.to_dashboard_match(_match(score={'games': [[6], [4]], 'points': ['15', None]}), 'atp')
        self.assertNotIn('current_game', out['score'])
        self.assertEqual(out['score']['sets'], [{'p1': 6, 'p2': 4}])

    def test_missing_score_object_is_tolerated(self):
        out = ltapi.to_dashboard_match(_match(score=None), 'atp')
        self.assertEqual(out['score']['sets'], [])
        self.assertIsNone(out['serving'])

    def test_null_surface_and_round_become_empty_strings(self):
        out = ltapi.to_dashboard_match(_match(surface=None, round=None), 'atp')
        self.assertEqual(out['surface'], '')
        self.assertEqual(out['round'], '')

    def test_unranked_player_keeps_a_null_rank(self):
        out = ltapi.to_dashboard_match(
            _match(players={'p1': {'name': 'Qualifier', 'country': None, 'ranking': None}, 'p2': {}}),
            'atp',
        )
        self.assertIsNone(out['player1']['rank'])
        self.assertEqual(out['player1']['country'], '')
        self.assertEqual(out['player2']['name'], '')

    def test_match_without_an_id_is_skipped(self):
        self.assertIsNone(ltapi.to_dashboard_match(_match(id=None), 'atp'))


class TestPayloadFilter(unittest.TestCase):

    def test_keeps_live_singles_only(self):
        rows = [
            _match(id=1),
            _match(id=2, is_doubles=True),
            _match(id=3, status='completed'),
            _match(id=4, status='upcoming'),
        ]
        out = ltapi.build_payload(rows, 'atp')
        self.assertEqual([m['id'] for m in out], ['ltapi_1'])

    def test_tour_label_is_uppercased(self):
        self.assertEqual(ltapi.build_payload([_match()], 'wta')[0]['tour'], 'WTA')

    def test_output_is_json_serialisable(self):
        import json
        json.dumps(ltapi.build_payload([_match()], 'atp'))


if __name__ == '__main__':
    unittest.main(verbosity=2)
