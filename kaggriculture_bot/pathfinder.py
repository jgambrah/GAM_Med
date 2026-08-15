"""
Kaggriculture Pathfinder & Grid Movement Engine
Computes 2D Manhattan & A* paths for Farmer and Farm Hands.
"""

import heapq

DIRECTIONS = {
    "NORTH": (0, -1),
    "SOUTH": (0, 1),
    "EAST": (1, 0),
    "WEST": (-1, 0),
}

def manhattan_distance(pos1, pos2):
    return abs(pos1[0] - pos2[0]) + abs(pos1[1] - pos2[1])

def get_next_step(start_pos, target_pos, grid_size=10):
    """
    Returns direction ("NORTH", "SOUTH", "EAST", "WEST") to move from start_pos towards target_pos.
    Returns "PASS" if already at target_pos.
    """
    if start_pos == target_pos:
        return "PASS"

    sx, sy = start_pos
    tx, ty = target_pos

    best_dir = "PASS"
    best_dist = manhattan_distance(start_pos, target_pos)

    for direction, (dx, dy) in DIRECTIONS.items():
        nx, ny = sx + dx, sy + dy
        if 0 <= nx < grid_size and 0 <= ny < grid_size:
            dist = manhattan_distance((nx, ny), target_pos)
            if dist < best_dist:
                best_dist = dist
                best_dir = direction

    return best_dir

def get_shed_adjacent_positions(grid_size=10):
    """
    Center of board: boardSize // 2 = 5 for 10x10.
    Center tiles: (4,4), (5,4), (4,5), (5,5).
    """
    half = grid_size // 2
    return [(half - 1, half - 1), (half, half - 1), (half - 1, half), (half, half)]

def is_adjacent_to_shed(pos, grid_size=10):
    return pos in get_shed_adjacent_positions(grid_size)
