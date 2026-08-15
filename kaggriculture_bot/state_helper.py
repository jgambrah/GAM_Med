"""
Kaggriculture State Representation & Parser Helper
Parses raw Kaggle Environment observations into structured state queries.
"""

class FarmState:
    def __init__(self, obs):
        self.raw_obs = obs
        self.player_index = obs.get("player", 0)
        self.farms = obs.get("farms", [])
        self.my_farm = self.farms[self.player_index] if self.farms and self.player_index < len(self.farms) else {}
        self.private = obs.get("private", {}) or {}
        
        # Grid & Money
        self.money = self.my_farm.get("money", 0)
        self.tiles = self.my_farm.get("tiles", [])
        self.grid_size = len(self.tiles) if self.tiles else 10
        self.unlocked_quadrants = set(self.my_farm.get("unlocked_quadrants", ["NW"]))
        
        # Positions
        self.farmer_pos = tuple(self.my_farm.get("farmer", [4, 4]))
        self.hands_pos = [tuple(h) for h in self.my_farm.get("hands", [])]
        self.hires_today = self.my_farm.get("hires_today", 0)

        # Inventory & Seeds
        self.shed = self.private.get("shed", {})
        self.seeds = self.private.get("seeds", {})
        self.inventories = self.private.get("inventories", [])

        # Time & Market
        self.day = obs.get("day", 0)
        self.hour = obs.get("hour", 0)
        self.market = obs.get("market", {})

    def get_tile(self, x, y):
        if 0 <= y < len(self.tiles) and 0 <= x < len(self.tiles[y]):
            return self.tiles[y][x]
        return None

    def is_tile_unlocked(self, x, y):
        half = self.grid_size // 2
        if x < half and y < half:
            return "NW" in self.unlocked_quadrants
        elif x >= half and y < half:
            return "NE" in self.unlocked_quadrants
        elif x < half and y >= half:
            return "SW" in self.unlocked_quadrants
        else:
            return "SE" in self.unlocked_quadrants

    def get_empty_unlocked_tiles(self):
        empty = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                if self.is_tile_unlocked(x, y):
                    # Don't plant on center shed adjacent tiles if needed
                    if self.get_tile(x, y) is None:
                        empty.append((x, y))
        return empty

    def get_plants_needing_water(self):
        unwatered = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") == "PLANT":
                    if not t.get("watered_today", False):
                        unwatered.append(((x, y), t))
        return unwatered

    def get_plants_ready_to_harvest(self):
        harvestable = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") == "PLANT":
                    if t.get("yield_units", 0) > 0:
                        harvestable.append(((x, y), t))
        return harvestable

    def get_animals_needing_feed(self):
        unfed = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") in ["COOP", "PASTURE"]:
                    if t.get("animal") and not t.get("fed_today", False):
                        unfed.append(((x, y), t))
        return unfed

    def get_animals_with_fertilizer(self):
        fert = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") in ["COOP", "PASTURE"]:
                    if t.get("fertilizer_available", False):
                        fert.append(((x, y), t))
        return fert

    def get_unfertilized_high_value_crops(self):
        unfert = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") == "PLANT":
                    if t.get("crop") in ["MELON", "STRAWBERRY"] and t.get("fertilized_until_day", -1) < self.day:
                        unfert.append(((x, y), t))
        return unfert

    def get_weeds(self):
        weeds = []
        for y in range(self.grid_size):
            for x in range(self.grid_size):
                t = self.get_tile(x, y)
                if isinstance(t, dict) and t.get("kind") == "WEED":
                    weeds.append((x, y))
        return weeds

    def total_shed_item_count(self):
        return sum(v for k, v in self.shed.items() if k != "seeds")
