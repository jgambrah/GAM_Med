"""
Kaggriculture Advanced Strategic Planner & Optimizer
High-performance task scheduler, economic optimizer, and action coordinator.
"""

from state_helper import FarmState
from market_engine import MarketEngine
from pathfinder import get_next_step, manhattan_distance

class StrategicPlanner:
    def __init__(self):
        self.market_engine = MarketEngine()

    def plan_turn(self, obs):
        state = FarmState(obs)
        self.market_engine.update(state.market)

        market_orders = []
        
        # ==========================================
        # 1. MARKET ORDER PLANNING
        # ==========================================
        
        # A. Land Expansion (Buy NE at $1k, SW at $2k, SE at $4k)
        unlocked_count = len(state.unlocked_quadrants)
        if unlocked_count == 1 and state.money >= 1100 and state.day <= 15:
            market_orders.append(["BUY_LAND"])
        elif unlocked_count == 2 and state.money >= 2200 and state.day <= 20:
            market_orders.append(["BUY_LAND"])
        elif unlocked_count == 3 and state.money >= 4500 and state.day <= 24:
            market_orders.append(["BUY_LAND"])

        # B. Farm Hand Hiring (Hire 1-2 hands daily if cash permits and work exists)
        plants_needing_water = state.get_plants_needing_water()
        harvestable_plants = state.get_plants_ready_to_harvest()
        workload = len(plants_needing_water) + len(harvestable_plants)

        if state.money >= 50 and state.hires_today < 2 and workload >= 3 and state.day <= 26:
            market_orders.append(["HIRE"])

        # C. Selling Shed & Inventory Produce
        for item, qty in state.shed.items():
            if item != "seeds" and qty > 0:
                # Sell items regularly, or liquidate EVERYTHING on days 27-30
                if state.day >= 27 or state.total_shed_item_count() >= 8 or item in ["MELON", "STRAWBERRY", "EGG", "MILK", "WOOL"]:
                    market_orders.append(["SELL", item, qty])

        # D. Seed Purchases based on Phase & Money
        best_crop = self.market_engine.select_best_crop(state.money, state.day)
        if best_crop and state.seeds.get(best_crop, 0) == 0 and state.money >= 20:
            # Buy 2-3 seeds if we have empty tiles
            empty_tiles = state.get_empty_unlocked_tiles()
            buy_qty = min(len(empty_tiles) + 1, 3) if empty_tiles else 1
            market_orders.append(["BUY_SEED", best_crop, buy_qty])

        # Ensure wheat for animal feed if we have animals
        animals_unfed = state.get_animals_needing_feed()
        if animals_unfed and state.seeds.get("WHEAT", 0) == 0 and state.shed.get("WHEAT", 0) == 0:
            market_orders.append(["BUY_PRODUCT", "WHEAT", len(animals_unfed)])

        # ==========================================
        # 2. WORKER TASK ALLOCATION (FARMER & HANDS)
        # ==========================================
        
        all_workers = [state.farmer_pos] + state.hands_pos
        worker_actions = []

        for w_idx, w_pos in enumerate(all_workers):
            wx, wy = w_pos
            current_tile = state.get_tile(wx, wy)
            action = ["PASS"]

            # Priority 1: Water plant if standing on unwatered plant
            if isinstance(current_tile, dict) and current_tile.get("kind") == "PLANT":
                if not current_tile.get("watered_today", False):
                    action = ["WATER"]
                elif current_tile.get("yield_units", 0) > 0:
                    action = ["HARVEST"]
                else:
                    # Move to nearest unwatered or harvestable plant
                    action = self._find_move_to_nearest_task(w_pos, state)

            # Priority 2: Plant seed if standing on empty tile
            elif current_tile is None:
                planted = False
                # Try planting best seed
                for crop in ["MELON", "STRAWBERRY", "CARROT", "WHEAT", "TOMATO"]:
                    if state.seeds.get(crop, 0) > 0:
                        action = ["PLANT", crop]
                        planted = True
                        break
                if not planted:
                    action = self._find_move_to_nearest_task(w_pos, state)

            # Priority 3: Clear weeds if standing on weed
            elif isinstance(current_tile, dict) and current_tile.get("kind") == "WEED":
                action = ["DIG"]

            # Priority 4: Animal feed / harvest
            elif isinstance(current_tile, dict) and current_tile.get("kind") in ["COOP", "PASTURE"]:
                if current_tile.get("animal") and not current_tile.get("fed_today", False):
                    action = ["FEED"]
                elif current_tile.get("yield_units", 0) > 0:
                    action = ["HARVEST"]
                elif current_tile.get("fertilizer_available", False):
                    action = ["COLLECT_FERTILIZER"]
                else:
                    action = self._find_move_to_nearest_task(w_pos, state)

            else:
                action = self._find_move_to_nearest_task(w_pos, state)

            worker_actions.append(action)

        farmer_action = worker_actions[0] if worker_actions else ["PASS"]
        hands_actions = worker_actions[1:] if len(worker_actions) > 1 else []

        return {
            "farmer": farmer_action,
            "hands": hands_actions,
            "market": market_orders[:10]
        }

    def _find_move_to_nearest_task(self, worker_pos, state):
        """
        Finds nearest tile needing attention (Watering > Harvesting > Planting > Weeds).
        """
        # Target 1: Unwatered plants
        unwatered = state.get_plants_needing_water()
        if unwatered:
            nearest_pos = min(unwatered, key=lambda item: manhattan_distance(worker_pos, item[0]))[0]
            step_dir = get_next_step(worker_pos, nearest_pos, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        # Target 2: Harvestable plants
        harvestable = state.get_plants_ready_to_harvest()
        if harvestable:
            nearest_pos = min(harvestable, key=lambda item: manhattan_distance(worker_pos, item[0]))[0]
            step_dir = get_next_step(worker_pos, nearest_pos, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        # Target 3: Empty tiles (if seeds are available)
        if any(v > 0 for v in state.seeds.values()):
            empty_tiles = state.get_empty_unlocked_tiles()
            if empty_tiles:
                nearest_pos = min(empty_tiles, key=lambda pos: manhattan_distance(worker_pos, pos))
                step_dir = get_next_step(worker_pos, nearest_pos, state.grid_size)
                if step_dir != "PASS":
                    return [step_dir]

        # Target 4: Weeds
        weeds = state.get_weeds()
        if weeds:
            nearest_pos = min(weeds, key=lambda pos: manhattan_distance(worker_pos, pos))
            step_dir = get_next_step(worker_pos, nearest_pos, state.grid_size)
            if step_dir != "PASS":
                return [step_dir]

        return ["PASS"]
