"""
Kaggriculture Market & Economic Engine
Models dynamic market prices, calculates sell price curves, and computes crop ROI.
"""

import math

# Competition Market Parameters Default Reference
MARKET_SPECS = {
    "WHEAT":      {"base": 25,  "I0": 10000, "T": 400, "below_func": "sqrt",   "below_target": 0.80, "above_func": "log",    "above_target": 0.20},
    "CARROT":     {"base": 35,  "I0": 10000, "T": 450, "below_func": "log",    "below_target": 0.20, "above_func": "sqrt",   "above_target": 0.70},
    "TOMATO":     {"base": 60,  "I0": 10000, "T": 200, "below_func": "linear", "below_target": 0.40, "above_func": "sqrt",   "above_target": 0.60},
    "STRAWBERRY": {"base": 120, "I0": 10000, "T": 100, "below_func": "sqrt",   "below_target": 0.70, "above_func": "linear font", "above_target": 1.60},
    "MELON":      {"base": 250, "I0": 10000, "T": 300, "below_func": "log",    "below_target": 0.20, "above_func": "sq",     "above_target": 3.60},
    "EGG":        {"base": 50,  "I0": 10000, "T": 332, "below_func": "linear", "below_target": 0.40, "above_func": "log",    "above_target": 0.20},
    "MILK":       {"base": 160, "I0": 10000, "T": 122, "below_func": "sqrt",   "below_target": 0.60, "above_func": "linear", "above_target": 1.60},
    "WOOL":       {"base": 200, "I0": 10000, "T": 105, "below_func": "log",    "below_target": 0.20, "above_func": "sq",     "above_target": 3.20},
    "FERTILIZER": {"base": 100, "I0": 10000, "T": 200, "below_func": "linear", "below_target": 0.40, "above_func": "linear", "above_target": 0.40},
}

CROP_SPECS = {
    "WHEAT":      {"seed_cost": 10,  "base_price": 25,  "first_yield_days": 2,  "max_yield_days": 4,  "yield_units": 6, "ongoing": False},
    "CARROT":     {"seed_cost": 20,  "base_price": 35,  "first_yield_days": 2,  "max_yield_days": 3,  "yield_units": 4, "ongoing": False},
    "TOMATO":     {"seed_cost": 50,  "base_price": 60,  "first_yield_days": 8,  "max_yield_days": 11, "yield_units": 4, "ongoing": True},
    "STRAWBERRY": {"seed_cost": 100, "base_price": 120, "first_yield_days": 10, "max_yield_days": 16, "yield_units": 4, "ongoing": True},
    "MELON":      {"seed_cost": 80,  "base_price": 250, "first_yield_days": 10, "max_yield_days": 10, "yield_units": 6, "ongoing": False},
}

class MarketEngine:
    def __init__(self, market_obs=None):
        self.market_prices = market_obs.get("prices", {}) if market_obs else {}
        self.market_inventory = market_obs.get("inventory", {}) if market_obs else {}

    def update(self, market_obs):
        self.market_prices = market_obs.get("prices", {})
        self.market_inventory = market_obs.get("inventory", {})

    def get_price(self, item):
        return self.market_prices.get(item, MARKET_SPECS.get(item, {}).get("base", 10))

    def evaluate_crop_roi(self, crop, current_day, max_season_days=30):
        """
        Calculates Net Expected Profit per tile per day remaining for a crop.
        Returns -999 if the crop cannot mature before season ends!
        """
        spec = CROP_SPECS.get(crop)
        if not spec:
            return -999

        days_needed = spec["max_yield_days"]
        days_remaining = max_season_days - current_day
        
        # Will the crop yield before end of season?
        if days_remaining < spec["first_yield_days"]:
            return -999 # Waste of money!

        price = self.get_price(crop if crop != "WHEAT" else "WHEAT")
        expected_revenue = spec["yield_units"] * price
        net_profit = expected_revenue - spec["seed_cost"]
        
        # Profit per day occupied
        roi_per_day = net_profit / max(1, min(days_needed, days_remaining))
        return roi_per_day

    def select_best_crop(self, available_money, current_day, max_season_days=30):
        """
        Selects optimal crop to plant based on current day and capital.
        """
        days_remaining = max_season_days - current_day

        # Phase 3 (Days 26-30): Stop planting entirely
        if days_remaining <= 2:
            return None

        # Short term phase (Days 20-25): Wheat or Carrot ONLY
        if days_remaining < 8:
            if available_money >= 20 and self.evaluate_crop_roi("CARROT", current_day) > 0:
                return "CARROT"
            elif available_money >= 10 and self.evaluate_crop_roi("WHEAT", current_day) > 0:
                return "WHEAT"
            return None

        # Medium to Long term (Days 0-19): High ROI crops
        candidates = ["MELON", "STRAWBERRY", "CARROT", "WHEAT", "TOMATO"]
        best_crop = None
        best_score = -999

        for crop in candidates:
            cost = CROP_SPECS[crop]["seed_cost"]
            if available_money >= cost:
                score = self.evaluate_crop_roi(crop, current_day)
                if score > best_score:
                    best_score = score
                    best_crop = crop

        return best_crop
