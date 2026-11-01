"""Small in-process TTL/LRU cache for optional AI report reuse."""

from __future__ import annotations

import copy
import threading
import time
from collections import OrderedDict
from typing import Any


class TTLCache:
    def __init__(self, maxsize: int = 64, ttl_seconds: int = 900):
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self._items: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Any | None:
        with self._lock:
            item = self._items.get(key)
            if item is None:
                self.misses += 1
                return None
            created, value = item
            if time.time() - created > self.ttl_seconds:
                self._items.pop(key, None)
                self.misses += 1
                return None
            self._items.move_to_end(key)
            self.hits += 1
            return copy.deepcopy(value)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._items[key] = (time.time(), copy.deepcopy(value))
            self._items.move_to_end(key)
            while len(self._items) > self.maxsize:
                self._items.popitem(last=False)

    def stats(self) -> dict:
        with self._lock:
            return {"hits": self.hits, "misses": self.misses, "size": len(self._items)}
