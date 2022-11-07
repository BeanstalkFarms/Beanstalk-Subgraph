import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Silo-Replanted/Beanstalk";
import { handleAddDeposit } from "../../src/SiloHandler";
import { BEAN_DECIMALS } from "../../src/utils/Constants";

export function createWeatherChangeEvent(season: BigInt, caseID: BigInt, change: i32): void { }
export function createSowEvent(account: string, index: BigInt, beans: BigInt, pods: BigInt): void { }
export function createHarvestEvent(account: string, plots: BigInt[], beans: BigInt): void { }
export function createPlotTransferEvent(from: string, to: string, id: BigInt, pods: BigInt): void { }
export function createSupplyIncreaseEvent(season: BigInt, price: BigInt, newHarvestable: BigInt, newSilo: BigInt, newSoil: i32): void { }
export function createSupplyDecreaseEvent(season: BigInt, price: BigInt, newSoil: i32): void { }
export function createSupplyNeutralEvent(season: BigInt, newSoil: i32): void { }
export function createFundFundraiserEvent(id: BigInt, fundraiser: string, token: string, amount: BigInt): void { }
