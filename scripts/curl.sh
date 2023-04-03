#!/usr/bin/env bash

curl -XPOST localhost:3001/repowax/my-repo \
     -H "X-Hub-Signature-256: sha256=349574289305875829393248759032478590283745983247590378" \
     -d '{"field1": "value1", "field2": 2}'
