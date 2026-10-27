from tradebot.ui.cli import main

# guard required: agent worker processes are started with "spawn" (default on Windows),
# which re-imports this module in every child
if __name__ == "__main__":
    raise SystemExit(main())
