"""Runs the three agents in isolation: one worker process per agent.

Agents receive a read-only (frozen, pickled) snapshot, share no memory and
never see each other's votes.
"""

from __future__ import annotations

import asyncio
import logging
import multiprocessing
from concurrent.futures import ProcessPoolExecutor
from concurrent.futures.process import BrokenProcessPool
from typing import Callable

from tradebot.agents import arbitrage, convergence, smart_money
from tradebot.agents.base import Snapshot, Vote

log = logging.getLogger(__name__)

AGENTS: dict[str, Callable[[Snapshot, dict], Vote]] = {
    arbitrage.NAME: arbitrage.vote,
    convergence.NAME: convergence.vote,
    smart_money.NAME: smart_money.vote,
}


def safe_vote(name: str, snap: Snapshot, cfg: dict) -> Vote:
    try:
        return AGENTS[name](snap, cfg)
    except Exception as exc:  # an agent bug must never become a trade
        return Vote.none(name, f"agent error: {type(exc).__name__}: {exc}")


class AgentPool:
    def __init__(self, isolated: bool = True):
        self.isolated = isolated
        self._executors: dict[str, ProcessPoolExecutor] = {}
        if isolated:
            self._executors = {name: self._new_executor() for name in AGENTS}

    @staticmethod
    def _new_executor() -> ProcessPoolExecutor:
        ctx = multiprocessing.get_context("spawn")  # clean interpreter per agent, no shared memory
        return ProcessPoolExecutor(max_workers=1, mp_context=ctx)

    def _restart(self, name: str) -> None:
        log.warning("agent worker %s died: restarting it", name)
        self._executors[name].shutdown(wait=False, cancel_futures=True)
        self._executors[name] = self._new_executor()

    def _submit(self, loop, name: str, snap: Snapshot, cfg: dict):
        try:
            return loop.run_in_executor(self._executors[name], safe_vote, name, snap, cfg)
        except BrokenProcessPool:
            self._restart(name)
            return loop.run_in_executor(self._executors[name], safe_vote, name, snap, cfg)

    async def votes(self, snap: Snapshot, cfgs: dict[str, dict]) -> list[Vote]:
        """``cfgs`` maps agent name -> config dict; disabled agents vote NONE."""
        loop = asyncio.get_running_loop()
        tasks = []
        for name in AGENTS:
            cfg = cfgs.get(name, {})
            if not cfg.get("enabled", True):
                tasks.append(asyncio.sleep(0, Vote.none(name, "agent disabled")))
            elif self.isolated:
                tasks.append(self._submit(loop, name, snap, cfg))
            else:
                tasks.append(asyncio.sleep(0, safe_vote(name, snap, cfg)))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        out = []
        for name, r in zip(AGENTS, results):
            if isinstance(r, BrokenProcessPool):
                self._restart(name)
            out.append(r if isinstance(r, Vote) else Vote.none(name, f"worker error: {r!r}"))
        return out

    def vote_sync(self, snap: Snapshot, cfgs: dict[str, dict]) -> list[Vote]:
        """In-process variant used by the backtester (same agent code)."""
        return [safe_vote(n, snap, cfgs.get(n, {})) if cfgs.get(n, {}).get("enabled", True)
                else Vote.none(n, "agent disabled") for n in AGENTS]

    def shutdown(self) -> None:
        for ex in self._executors.values():
            ex.shutdown(wait=False, cancel_futures=True)
