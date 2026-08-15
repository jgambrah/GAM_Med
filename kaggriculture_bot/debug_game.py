from kaggle_environments import make
from main import agent

env = make("kaggriculture", configuration={"episodeSteps": 15}, debug=True)

for step in range(15):
    obs = env.state[0].observation if env.state else None
    if obs:
        farm = obs["farms"][0]
        tile_44 = farm["tiles"][4][4]
        action = agent(obs)
        print(f"Step {step:02d} | Money: ${farm['money']} | Tile(4,4): {tile_44} | Action: {action}")
    env.step([agent(obs) if obs else {"farmer": ["PASS"]}, "starter"])
