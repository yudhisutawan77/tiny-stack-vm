# tiny-stack-vm

[![make.fun](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/yudhisutawan77/tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/yudhisutawan77/tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

A faithful interpreter for the tiny stack ISA v1, entered in the
[make.fun bounty](https://make.fun/bounty/tiny-stack-vm-01-run-20261122).

Run with `node main.ts`. It reads `/input/<id>/program.bin` and
`/input/<id>/input.bin` (or `MAKEFUN_INPUT_DIR` / `MAKEFUN_OUTPUT_DIR`)
and writes `/output/<id>/stdout.bin` plus `/output/<id>/exit.txt` for
every instance, traps included.
