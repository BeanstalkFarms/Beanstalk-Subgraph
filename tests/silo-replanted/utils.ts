import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit } from "../../generated/Silo-Replanted/Beanstalk";
import { handleAddDeposit } from "../../src/SiloHandler";
import { BEAN_DECIMALS } from "../../src/utils/Constants";

export function handleAddDeposits(events: AddDeposit[]): void {
    events.forEach(event => {
        handleAddDeposit(event)
    })
}

export function createAddDepositEvent(account: string, token: string, season: i32, amount: i32, tokenDecimals: i32, bdv: i32): AddDeposit {
    let addDepositEvent = changetype<AddDeposit>(newMockEvent())
    addDepositEvent.parameters = new Array()
    let accountParam = new ethereum.EventParam("account", ethereum.Value.fromAddress(Address.fromString(account)))
    let tokenParam = new ethereum.EventParam("token", ethereum.Value.fromAddress(Address.fromString(token)))
    let seasonParam = new ethereum.EventParam("season", ethereum.Value.fromI32(season))
    let amountParam = new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(amount).times(BigInt.fromI32(10 ** tokenDecimals))))
    let bdvParam = new ethereum.EventParam("bdv", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(bdv).times(BigInt.fromI32(10 ** BEAN_DECIMALS))))

    addDepositEvent.parameters.push(accountParam)
    addDepositEvent.parameters.push(tokenParam)
    addDepositEvent.parameters.push(seasonParam)
    addDepositEvent.parameters.push(amountParam)
    addDepositEvent.parameters.push(bdvParam)

    return addDepositEvent as AddDeposit
}

