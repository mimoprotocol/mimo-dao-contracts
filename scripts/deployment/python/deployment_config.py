"""
Deployment Configuration file
=============================
This script holds customizeable / sensetive values related to the DAO deployment scripts.
See `README.md` in this directory for more information on how deployment works.
"""

import os
from brownie import rpc, web3, accounts
from web3 import middleware
from web3.gas_strategies.time_based import fast_gas_price_strategy as gas_strategy

DEPLOYMENTS_JSON = "deployments.json"
REQUIRED_CONFIRMATIONS = 1


def get_live_admin():
    admin = accounts.add(os.environ["PRIVATE_KEY"])
    return admin


if not rpc.is_active():
    # logic that only executes in a live environment
    web3.eth.setGasPriceStrategy(gas_strategy)
    web3.middleware_onion.add(middleware.time_based_cache_middleware)
    web3.middleware_onion.add(middleware.latest_block_based_cache_middleware)
    web3.middleware_onion.add(middleware.simple_cache_middleware)