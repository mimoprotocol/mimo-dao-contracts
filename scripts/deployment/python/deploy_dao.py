import json

from brownie import (
    ERC20MIMO,
    accounts,
)

from . import deployment_config as config

def live_part_one():
    admin = config.get_live_admin()
    deploy_part_one(admin, config.REQUIRED_CONFIRMATIONS, config.DEPLOYMENTS_JSON)


def development():
    # token, voting_escrow = deploy_part_one(accounts[0])
    token = deploy_part_one(accounts[0])


def deploy_part_one(admin, confs=1, deployments_json=None):
    token = ERC20MIMO.deploy("Mimo DAO Token", "MIMO", 18, {
        "from": admin,
        "required_confs": confs, 
        # "gas_price": 1000000000000,
    })
    # voting_escrow = VotingEscrow.deploy(
    #     token,
    #     "Vote-escrowed CRV",
    #     "veCRV",
    #     "veCRV_1.0.0",
    #     {"from": admin, "required_confs": confs},
    # )
    deployments = {
        "ERC20MIMO": token.address,
        # "VotingEscrow": voting_escrow.address,
    }
    if deployments_json is not None:
        with open(deployments_json, "w") as fp:
            json.dump(deployments, fp)
        print(f"Deployment addresses saved to {deployments_json}")

    # return token, voting_escrow
    return token
