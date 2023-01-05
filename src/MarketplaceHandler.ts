import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    PodListingCancelled,
    PodListingCreated as PodListingCreated_v1,
    PodListingFilled as PodListingFilled_v1,
    PodOrderCancelled,
    PodOrderCreated as PodOrderCreated_v1,
    PodOrderFilled as PodOrderFilled_v1
} from "../generated/Field/Beanstalk";
import { PodListingCreated as PodListingCreated_v1_1 } from "../generated/Marketplace-Replanted/Beanstalk";
import {
    PodListingCreated as PodListingCreated_v2,
    PodListingFilled as PodListingFilled_v2,
    PodOrderCreated as PodOrderCreated_v2,
    PodOrderFilled as PodOrderFilled_v2
} from "../generated/BIP29-PodMarketplace/Beanstalk";

import {
    Plot,
    PodListing
} from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";

/* ------------------------------------
 * GENERIC CLASSES
 * ------------------------------------
 */
class Generic__PodListingCreated extends ethereum.Event {
    get params(): Generic__PodListingCreated__Params {
      return new Generic__PodListingCreated__Params(this);
    }
}

class Generic__PodListingCreated__Params {
    _event: Generic__PodListingCreated;
    constructor(event: Generic__PodListingCreated) {
      this._event = event;
    }
    get account(): Address {
        return this._event.parameters[0].value.toAddress();
    }
    get index(): BigInt {
        return this._event.parameters[1].value.toBigInt();
    }
    get start(): BigInt {
        return this._event.parameters[2].value.toBigInt();
    }
    get amount(): BigInt {
        return this._event.parameters[3].value.toBigInt();
    }
    get pricePerPod(): i32 {
        return this._event.parameters[4].value.toI32();
    }
    get maxHarvestableIndex(): BigInt {
        return this._event.parameters[5].value.toBigInt();
    }
}

/* ------------------------------------
 * COMMON FUNCTIONS
 * ------------------------------------
 */

function getPlot(index: BigInt) : Plot | null {
    return Plot.load(index.toString());  
}

function upsertPlot(index: BigInt): Plot {
    let plot = getPlot(index);
    if (plot == null) {
        plot = new Plot(index.toString())
        plot.listing = null
        plot.save()
    }
    return plot
}

function getPodListing(index: BigInt, hash: Bytes): PodListing | null {
    let id = index.toString() + '-' + hash.toHexString();
    let listing = PodListing.load(id)
    return listing
}

function upsertPodListing(index: BigInt, hash: Bytes): PodListing {
    let id = index.toString() + '-' + hash.toHexString();
    let listing = PodListing.load(id)

    if (listing == null) {
        listing = new PodListing(id)
        listing.account = ''

        listing.index = index
        listing.start = ZERO_BI
        listing.mode = 0 // 0 = wallet, 1 = Beanstalk

        listing.maxHarvestableIndex = ZERO_BI
        listing.minFillAmount = ZERO_BI

        listing.pricePerPod = 0

        listing.podsTotal = ZERO_BI
        listing.podsFilled = ZERO_BI        
        listing.podsRemaining = ZERO_BI
        listing.podsCancelled = ZERO_BI
        
        listing.status = ''
        listing.createdAt = ZERO_BI
        listing.updatedAt = ZERO_BI
        listing.creationHash = ''

        listing.save()
    }
    
    return listing
}


function _initPodListing<T extends Generic__PodListingCreated>(event: T) : PodListing {
    // Using an existing Plot entity works here since we'll 
    // be updating the `plot.listing` field below.
    let plot = upsertPlot(event.params.index)

    // Listing 
    let listing = upsertPodListing(event.params.index, event.transaction.hash)
    
    listing.account = event.params.account.toHexString()
    listing.index = event.params.index
    listing.start = event.params.start
    listing.maxHarvestableIndex = event.params.maxHarvestableIndex
    listing.pricePerPod = event.params.pricePerPod
    // listing.mode = set externally
    // listing.pricingType = set externally
    // listing.pricingFunction = set externally

    listing.podsTotal = event.params.amount
    listing.podsFilled = ZERO_BI
    listing.podsRemaining = event.params.amount
    listing.podsCancelled = ZERO_BI

    listing.status = 'ACTIVE'
    listing.createdAt = event.block.timestamp
    listing.updatedAt = event.block.timestamp
    listing.creationHash = event.transaction.hash.toHexString()
    listing.save()

    // Update plot
    plot.listing = listing.id
    plot.save()

    return listing
}

function _fillPodListing<T extends PodListingFilled_v1>(event: T) : PodListing | null {
    let index = event.params.index;
    let plot = getPlot(index)
    if (plot == null || plot.listing == null) {
        log.error('_fillPodListing: Tried to find PodListing using a Plot that does not exist: txn = {}, index = {}', [event.transaction.hash.toHexString(), index.toString()]);
        return null;
    }

    let id = plot.listing as string
    let listing = PodListing.load(id)
    if (listing == null) {
        log.error('_fillPodListing: Tried to fill PodListing that does not exist: txn = {}, id = {}, index = {}', [event.transaction.hash.toHexString(), id, index.toString()]);
        return null;
    }


    // Update listing
    listing.podsFilled = listing.podsFilled.plus(event.params.amount)
    listing.podsRemaining = listing.podsRemaining.minus(event.params.amount)
    listing.updatedAt = event.block.timestamp

    if (listing.podsRemaining == ZERO_BI) {
        listing.status = 'FILLED'
    } else {
        // For the first fill, listing.start may be non-zero
        // For subsequent fills, listing.start always equals 0.
        let newIndex = (
            index
                .plus(listing.start)
                .plus(event.params.amount)
        );
        
        listing.index = newIndex
        listing.start = ZERO_BI

        let newPlot = upsertPlot(newIndex)
        newPlot.listing = listing.id
        newPlot.save()
    }
    
    listing.save()
    return listing
}

/* ------------------------------------
 * POD MARKETPLACE V1
 * 
 * Proposal: BIP-11 https://bean.money/bip-11
 * Deployed: 02/05/2022 @ block 14148509
 * Code: https://github.com/BeanstalkFarms/Beanstalk/commit/75a67fc94cf2637ac1d7d7c89645492e31423fed
 * ------------------------------------
 */

export function handlePodListingCreated(event: PodListingCreated_v1): void {
    const listing = _initPodListing(event);
    listing.mode = event.params.toWallet === true ? 0 : 1;
    listing.minFillAmount = ZERO_BI; // defaults to zero for legacy entities
    listing.save();
}

export function handlePodListingCancelled(event: PodListingCancelled): void {
    let index = event.params.index;
    let plot = getPlot(index)
    if (plot == null || plot.listing == null) {
        log.error('handlePodListingCancelled: Tried to find PodListing using a Plot that does not exist: txn = {}, index = {}', [event.transaction.hash.toHexString(), index.toString()]);
        return;
    }

    let id = plot.listing as string
    let listing = PodListing.load(id)
    if (listing == null) {
        log.error('handlePodListingCancelled: Tried to fill PodListing that does not exist: txn = {}, id = {}, index = {}', [event.transaction.hash.toHexString(), id, index.toString()]);
        return;
    }

    // FIXME(maybe?): only update status if == ACTIVE

    listing.status = 'CANCELLED'
    listing.podsCancelled = listing.podsRemaining
    listing.podsRemaining = ZERO_BI
    listing.updatedAt = event.block.timestamp
    listing.save()

    plot.listing = null
    plot.save()
}

export function handlePodListingFilled(event: PodListingFilled_v1): void {
    _fillPodListing(event);
}

export function handlePodOrderCreated(event: PodOrderCreated_v1): void {
    // let order = loadPodOrder(event.params.id)

    // order.account = event.params.account.toHexString()
    // order.createdAt = event.block.timestamp
    // order.updatedAt = event.block.timestamp
    // order.status = 'ACTIVE'
    // order.podAmount = event.params.amount
    // order.beanAmount = event.params.amount.times(BigInt.fromI32(event.params.pricePerPod)).div(BigInt.fromString('1000000'))
    // order.podAmountFilled = ZERO_BI
    // order.maxPlaceInLine = event.params.maxPlaceInLine
    // order.pricePerPod = event.params.pricePerPod
    // order.creationHash = event.transaction.hash.toHexString()
    // order.save()
}

export function handlePodOrderFilled(event: PodOrderFilled_v1): void {
    // let order = loadPodOrder(event.params.id)
    // let beanAmount = BigInt.fromI32(order.pricePerPod).times(event.params.amount).div(BigInt.fromI32(1000000))

    // order.updatedAt = event.block.timestamp
    // order.podAmountFilled = order.podAmountFilled.plus(event.params.amount)
    // order.beanAmountFilled = order.beanAmountFilled.plus(beanAmount)
    // order.status = order.podAmount == order.podAmountFilled ? 'FILLED' : 'ACTIVE'

    // order.save()
}

export function handlePodOrderCancelled(event: PodOrderCancelled): void {
    // let order = loadPodOrder(event.params.id)

    // order.status = order.podAmountFilled == ZERO_BI ? 'CANCELLED' : 'CANCELLED_PARTIAL'
    // order.updatedAt = event.block.timestamp
    // order.save()
}

/* ------------------------------------
 * POD MARKETPLACE V1 - REPLANTED
 * 
 * When Beanstalk was Replanted, `event.params.mode` was changed from
 * `bool` to `uint8`. 
 * 
 * Proposal: ...
 * Deployed: ... at block 15277986
 * ------------------------------------
 */

export function handlePodListingCreated_v1_1(event: PodListingCreated_v1_1): void {
    let listing = _initPodListing<PodListingCreated_v1_1>(event);
    listing.mode = event.params.mode;
    listing.minFillAmount = ZERO_BI; // defaults to zero for legacy entities
    listing.save();
}

/* ------------------------------------
 * POD MARKETPLACE V2
 * 
 * Proposal: BIP-29 https://bean.money/bip-29
 * Deployed: 11/12/2022 @ block 15277986
 * ------------------------------------
 */

export function handlePodListingCreated_v2(event: PodListingCreated_v2): void {
    let listing = _initPodListing<PodListingCreated_v2>(event);
    listing.mode = event.params.mode;
    listing.pricingType = event.params.pricingType
    listing.pricingFunction = event.params.pricingFunction
    listing.minFillAmount = event.params.minFillAmount
    listing.save()
}

export function handlePodListingFilled_v2(event: PodListingFilled_v2): void {
    _fillPodListing(event);
}

export function handlePodOrderCreated_v2(event: PodOrderCreated_v2): void {
    // let order = loadPodOrder(event.params.id)
}

export function handlePodOrderFilled_v2(event: PodOrderFilled_v2): void {
    // let order = loadPodOrder(event.params.id)
    // let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())

    // order.updatedAt = event.block.timestamp
    // order.beanAmountFilled = order.beanAmountFilled.plus(event.params.costInBeans)
    // order.podAmountFilled = order.podAmountFilled.plus(event.params.amount)
    // order.status = order.beanAmount == order.beanAmountFilled ? 'FILLED' : 'ACTIVE'
}