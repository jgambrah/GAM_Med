"""
Kaggriculture Tournament Agent
Main entrypoint for Kaggle Submissions.
"""

import os
import sys

# Ensure local directory is in path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from state_helper import FarmState
from market_engine import MarketEngine
from pathfinder import get_next_step

planner_instance = None

def agent(obs):
    global planner_instance
    if planner_instance is None:
        from multi_tile_planner import MultiTilePlanner
        planner_instance = MultiTilePlanner()

    try:
        action = planner_instance.plan_turn(obs)
        return action
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"farmer": ["PASS"], "hands": [], "market": []}

# For direct Kaggle evaluation compliance
def my_agent(obs):
    return agent(obs)
