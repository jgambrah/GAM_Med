"""
Kaggriculture Local Simulation Harness
Runs games against baseline agents and evaluates reward scores.
"""

import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from kaggle_environments import make
from main import agent

def run_test_simulation(opponent="starter", episode_steps=720):
    print(f"Starting Kaggriculture Test Simulation: Agent vs {opponent} ({episode_steps} steps)...")
    env = make("kaggriculture", configuration={"episodeSteps": episode_steps}, debug=True)
    
    env.run([agent, opponent])
    
    final_step = env.steps[-1]
    print("\n================ SIMULATION RESULT ================")
    for i, s in enumerate(final_step):
        role_name = "Our Agent (P0)" if i == 0 else f"Opponent ({opponent}) (P1)"
        reward = s.get("reward", 0)
        status = s.get("status", "DONE")
        print(f"[{role_name}]: Final Bank Balance = ${reward} | Status = {status}")
    print("====================================================\n")
    
    return final_step

if __name__ == "__main__":
    opponent_type = sys.argv[1] if len(sys.argv) > 1 else "starter"
    steps = int(sys.argv[2]) if len(sys.argv) > 2 else 720
    run_test_simulation(opponent_type, steps)
