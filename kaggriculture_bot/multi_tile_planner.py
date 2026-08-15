"""
Kaggriculture High-Score Tuned Engine
Optimal 3-worker action density, controlled land expansion, and 100% end-of-season liquidation.
"""

from state_helper import FarmState
from pathfinder import get_next_step, manhattan_distance

MAX_YIELD_DAYS = {
    "CARROT": 3,
    "WHEAT": 4,
    "MELON": 10,
    "TOMATO": 11,
    "STRAWBERRY": 16
}

class MultiTilePlanner:
    def __init__(self):
        pass

    def plan_turn(self, obs):
        state = FarmState(obs)
        market_orders = []

        # ==========================================
        # 1. MARKET ORDERS (IMMEDIATE SELL, HIRING, SEEDS, EXPANSION)
        # ==========================================
        
        # A. Sell ALL produce sitting in shed immediately
        for item, qty in state.shed.items():
            if item != "seeds" and qty > 0:
                market_orders.append(["SELL", item, qty])

        # B. Farm Hand Hiring (Hire 2 farm hands daily for $2/day salary)
        if state.money >= 50 and state.hires_today < 2 and state.day <= 25:
            market_orders.append(["HIRE"])

        # C. Seed Purchasing Strategy
        days_remaining = 30 - state.day
        chosen_crop = "CARROT"
        seed_cost = 20

        if days_remaining >= 11 and state.money >= 350:
            chosen_crop = "MELON"
            seed_cost = 80
        elif days_remaining < 4:
            chosen_crop = None

        if chosen_crop:
            current_seeds = state.seeds.get(chosen_crop, 0)
            empty_count = len(state.get_empty_unlocked_tiles())
            num_workers = 1 + len(state.hands_pos)
            
            # Buy seed if seed count < worker count and empty space exists
            if current_seeds < num_workers and empty_count > 0 and state.money >= seed_cost:
                market_orders.append(["BUY_SEED", chosen_crop, 1])

        # D. Land Expansion Strategy (Buy NE at $1,000 when money >= $1,500)
        if len(state.unlocked_quadrants) == 1 and state.money >= 1500 and state.day <= 15:
            market_orders.append(["BUY_LAND"])

        # ==========================================
        # 2. WORKER ACTION ASSIGNMENTS
        # ==========================================
        all_workers = [state.farmer_pos] + state.hands_pos
        worker_actions = []
        assigned_targets = set()

        unwatered_plants = [pos for pos, _ in state.get_plants_needing_water()]
        harvestable_plants = [pos for pos, _ in state.get_plants_ready_to_harvest()]
        empty_tiles = state.get_empty_unlocked_tiles()
        weeds = state.get_weeds()

        for w_pos in all_workers:
            wx, wy = w_pos
            current_tile = state.get_tile(wx, wy)
            action = ["PASS"]

            # Priority 1: Action on current plant tile
            if isinstance(current_tile, dict) and current_tile.get("kind") == "PLANT":
                crop = current_tile.get("crop")
                planted_day = current_tile.get("planted_day", 0)
                crop_age = state.day - planted_day
                yield_units = current_tile.get("yield_units", 0)
                watered_today = current_tile.get("watered_today", False)
                max_age = MAX_YIELD_DAYS.get(crop, 3)

                if crop in ["CARROT", "WHEAT", "MELON"]:
                    if (crop_age >= max_age or state.day >= 27) and yield_units > 0:
                        action = ["HARVEST"]
                    elif not watered_today:
                        action = ["WATER"]
                    else:
                        action = self._assign_movement(w_pos, unwatered_plants, harvestable_plants, empty_tiles, weeds, assigned_targets, state)
                else:
                    if yield_units > 0:
                        action = ["HARVEST"]
                    elif not watered_today:
                        action = ["WATER"]
                    else:
                        action = self._assign_movement(w_pos, unwatered_plants, harvestable_plants, empty_tiles, weeds, assigned_targets, state)

            # Priority 2: Plant seed if standing on empty tile
            elif current_tile is None:
                planted = False
                allowed_crops = ["MELON", "CARROT", "WHEAT"] if (30 - state.day) >= 11 else ["CARROT", "WHEAT"]
                for crop in allowed_crops:
                    if state.seeds.get(crop, 0) > 0:
                        action = ["PLANT", crop]
                        planted = True
                        break
                if not planted:
                    action = self._assign_movement(w_pos, unwatered_plants, harvestable_plants, empty_tiles, weeds, assigned_targets, state)

            # Priority 3: Dig weed
            elif isinstance(current_tile, dict) and current_tile.get("kind") == "WEED":
                action = ["DIG"]

            else:
                action = self._assign_movement(w_pos, unwatered_plants, harvestable_plants, empty_tiles, weeds, assigned_targets, state)

            worker_actions.append(action)

        farmer_action = worker_actions[0] if worker_actions else ["PASS"]
        hands_actions = worker_actions[1:] if len(worker_actions) > 1 else []

        return {
            "farmer": farmer_action,
            "hands": hands_actions,
            "market": market_orders[:10]
        }

    def _assign_movement(self, w_pos, unwatered, harvestable, empty, weeds, assigned_targets, state):
        # 1. Unwatered Plants
        targets = [p for p in unwatered if p not in assigned_targets]
        if targets:
            best_target = min(targets, key=lambda p: manhattan_distance(w_pos, p))
            assigned_targets.add(best_target)
            step_dir = get_next_step(w_pos, best_target, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        # 2. Harvestable Plants
        targets = [p for p in harvestable if p not in assigned_targets]
        if targets:
            best_target = min(targets, key=lambda p: manhattan_distance(w_pos, p))
            assigned_targets.add(best_target)
            step_dir = get_next_step(w_pos, best_target, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        # 3. Empty tiles for planting
        if any(v > 0 for v in state.seeds.values()):
            targets = [p for p in empty if p not in assigned_targets]
            if targets:
                best_target = min(targets, key=lambda p: manhattan_distance(w_pos, p))
                assigned_targets.add(best_target)
                step_dir = get_next_step(w_pos, best_target, state.grid_size)
                if step_dir != "PASS":
                    return [step_dir]

        # 4. Weeds
        targets = [p for p in weeds if p not in assigned_targets]
        if targets:
            best_target = min(targets, key=lambda p: manhattan_distance(w_pos, p))
            assigned_targets.add(best_target)
            step_dir = get_next_step(w_pos, best_target, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        return ["PASS"]
