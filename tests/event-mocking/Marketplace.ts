import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { newMockEvent } from "matchstick-as/assembly/index";

import { AddDeposit, RemoveDeposit, RemoveDeposits } from "../../generated/Silo-Replanted/Beanstalk";
import { handleAddDeposit } from "../../src/SiloHandler";
import { BEAN_DECIMALS } from "../../src/utils/Constants";

/* V1 Marketplace events */
export function createPodListingCreatedEvent(account: string, index: BigInt, start: BigInt, amount: BigInt, pricePerPod: BigInt, maxHarvestableIndex: BigInt, toWallet: Boolean): void { }
export function createPodListingCancelledEvent(account: string, index: BigInt): void { }
export function createPodListingFilledEvent(from: string, to: string, index: BigInt, start: BigInt, amount: BigInt): void { }
export function createPodOrderCreatedEvent(account: string, id: Bytes, amount: BigInt, pricePerPod: BigInt, maxPlaceInLine: BigInt): void { }
export function createPodOrderFilledEvent(from: string, to: string, id: Bytes, index: BigInt, start: BigInt, amount: BigInt): void { }
export function createPodOrderCancelledEvent(account: string, id: Bytes): void { }

/* V1_1 Marketplace events (on replant) */
export function createPodListingCreatedEvent_v1_1(account: string, index: BigInt, start: BigInt, amount: BigInt, pricePerPod: BigInt, maxHarvestableIndex: BigInt, mode: BigInt): void { }

/** ===== Marketplace V2 Events ===== */
export function createPodListingCreatedEvent_v2(account: string, index: BigInt, start: BigInt, amount: BigInt, pricePerPod: BigInt, maxHarvestableIndex: BigInt, minFillAmount: BigInt, pricingFunction: Bytes, mode: BigInt, pricingType: BigInt): void { }
export function createPodListingFilledEvent_v2(from: string, to: string, index: BigInt, start: BigInt, amount: BigInt, costInBeans: BigInt): void { }
export function createPodOrderCreatedEvent_v2(account: string, id: Bytes, amount: BigInt, pricePerPod: BigInt, maxPlaceInLine: BigInt, minFillAmount: BigInt, pricingFunction: Bytes, pricingType: BigInt): void { }
export function createPodOrderFilledEvent_v2(from: string, to: string, id: Bytes, index: BigInt, start: BigInt, amount: BigInt, costInBeans: BigInt): void { }
