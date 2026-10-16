#!/bin/bash
cd /tmp/claude-0/-home-claude/6d433802-e58b-5969-9da0-123626eea299/scratchpad/banco
EMP=${1:-vorma}
for b in AB CD E F G H I J K JKs; do echo -n "$b: "; python3 /home/claude/vorma/tools/banco_pruebas.py frases_$b.json $EMP --hilos 8 --salida inf_$b.json 2>&1 | tail -1; done
