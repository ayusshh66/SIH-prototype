# ai/shadow_blocks — Shadow-block generation engine
# Groups compatible tasks into combined maintenance blocks per OPTIMIZATION_CONTRACT.md §4

from ai.shadow_blocks.engine import (
    ShadowBlockEngine,
    generate_shadow_block_candidates,
)

__all__ = ["ShadowBlockEngine", "generate_shadow_block_candidates"]
