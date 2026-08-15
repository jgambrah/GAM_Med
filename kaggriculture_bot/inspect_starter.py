import kaggle_environments
import inspect

env = kaggle_environments.make("kaggriculture")
starter_fn = env.agents["starter"]
print("=== STARTER AGENT SOURCE ===")
print(inspect.getsource(starter_fn))
