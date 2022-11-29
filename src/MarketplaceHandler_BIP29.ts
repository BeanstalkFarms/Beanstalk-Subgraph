import { Address, BigInt } from "@graphprotocol/graph-ts";
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
    PodListingCreated as PodListingCreatedEvent,
    PodListingFilled as PodListingFilledEvent,
    PodListingCancelled as PodListingCancelledEvent,
    PodOrderCreated as PodOrderCreatedEvent,
    PodOrderFilled as PodOrderFilledEvent,
    PodOrderCancelled as PodOrderCancelledEvent
} from "../generated/schema";
import { toDecimal, ZERO_BI } from "./utils/Decimals";
import { loadFarmer } from "./utils/Farmer";
import { loadPlot } from "./utils/Plot";
import { loadPodFill } from "./utils/PodFill";
import { createHistoricalPodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { createHistoricalPodOrder, loadPodOrder } from "./utils/PodOrder";

/* ======== PodMarket V2 Functions ======== */

export function handlePodListingCreated_v2(event: PodListingCreated_v2): void {

    let plotCheck = Plot.load(event.params.index.toString())
    if (plotCheck == null) { return }
    let plot = loadPlot(event.address, event.params.index)
    // Farmer Balances
    let listing = loadPodListing(event.params.account, event.params.index)

    if (listing.createdAt !== ZERO_BI) {
        createHistoricalPodListing(listing)
        listing.createdAt = ZERO_BI
        listing.status = 'ACTIVE'
    }

    listing.historyID = listing.id + '-' + event.block.timestamp.toString()
    listing.plot = plot.id
    listing.createdAt = listing.createdAt == ZERO_BI ? event.block.timestamp : listing.createdAt
    listing.updatedAt = event.block.timestamp
    listing.originalIndex = event.params.index
    listing.start = event.params.start
    listing.amount = event.params.amount
    listing.totalAmount = event.params.amount
    listing.remainingAmount = listing.totalAmount
    listing.pricePerPod = event.params.pricePerPod
    listing.minFillAmount = event.params.minFillAmount
    listing.maxHarvestableIndex = event.params.maxHarvestableIndex
    listing.mode = event.params.mode
    listing.save()

    plot.listing = listing.id
    plot.save()

    updateMarketListingBalances(event.address, plot.index, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    // Save the raw event data
    let id = 'podListingCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodListingCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.pricePerPod = event.params.pricePerPod
    rawEvent.maxHarvestableIndex = event.params.maxHarvestableIndex
    rawEvent.mode = event.params.mode
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

export function handlePodListingFilled_v2(event: PodListingFilled_v2): void {

    let listing = loadPodListing(event.params.from, event.params.index)

    updateMarketListingBalances(event.address, event.params.index, ZERO_BI, ZERO_BI, event.params.amount, event.params.costInBeans, event.block.timestamp)

    listing.filledAmount = event.params.amount
    listing.remainingAmount = listing.remainingAmount.minus(event.params.amount)
    listing.totalFilled = listing.totalFilled.plus(event.params.amount)
    listing.updatedAt = event.block.timestamp

    let originalHistoryID = listing.historyID
    if (listing.remainingAmount == ZERO_BI) {
        listing.status = 'FILLED'
    } else {
        let market = loadPodMarketplace(event.address)

        listing.status = 'FILLED_PARTIAL'
        let remainingListing = loadPodListing(Address.fromString(listing.farmer), listing.index.plus(event.params.amount).plus(listing.start))

        remainingListing.historyID = remainingListing.id + '-' + event.block.timestamp.toString()
        remainingListing.plot = listing.index.plus(event.params.amount).plus(listing.start).toString()
        remainingListing.createdAt = listing.createdAt
        remainingListing.updatedAt = event.block.timestamp
        remainingListing.originalIndex = listing.originalIndex
        remainingListing.start = ZERO_BI
        remainingListing.amount = listing.remainingAmount
        remainingListing.totalAmount = listing.totalAmount
        remainingListing.totalFilled = listing.totalFilled
        remainingListing.remainingAmount = listing.remainingAmount
        remainingListing.pricePerPod = listing.pricePerPod
        remainingListing.maxHarvestableIndex = listing.maxHarvestableIndex
        remainingListing.mode = listing.mode
        remainingListing.save()
        market.listingIndexes.push(remainingListing.index)
    }
    listing.save()

    let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())
    fill.createdAt = event.block.timestamp
    fill.listing = listing.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.save()

    // Save the raw event data
    let id = 'podListingFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodListingFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = originalHistoryID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

export function handlePodOrderCreated_v2(event: PodOrderCreated_v2): void {
    let order = loadPodOrder(event.params.id)
    let farmer = loadFarmer(event.params.account)

    if (order.status != '') { createHistoricalPodOrder(order) }

    order.historyID = order.id + '-' + event.block.timestamp.toString()
    order.farmer = event.params.account.toHexString()
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp
    order.status = 'ACTIVE'
    order.amount = event.params.amount.times(BigInt.fromI32(event.params.pricePerPod)).div(BigInt.fromI32(1000000))
    order.filledAmount = ZERO_BI
    order.minFillAmount = event.params.minFillAmount
    order.maxPlaceInLine = event.params.maxPlaceInLine
    order.pricePerPod = event.params.pricePerPod
    order.save()

    updateMarketOrderBalances(event.address, order.id, event.params.amount, ZERO_BI, ZERO_BI, ZERO_BI, event.block.timestamp)

    // Save the raw event data
    let id = 'podOrderCreated-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodOrderCreatedEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.orderId = event.params.id.toHexString()
    rawEvent.amount = event.params.amount
    rawEvent.pricePerPod = event.params.pricePerPod
    rawEvent.maxPlaceInLine = event.params.maxPlaceInLine
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

export function handlePodOrderFilled_v2(event: PodOrderFilled_v2): void {
    let order = loadPodOrder(event.params.id)
    let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())

    order.updatedAt = event.block.timestamp
    order.filledAmount = order.filledAmount.plus(event.params.amount)
    order.status = order.amount == order.filledAmount ? 'FILLED' : 'ACTIVE'
    order.save()

    fill.createdAt = event.block.timestamp
    fill.order = order.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.save()

    updateMarketOrderBalances(event.address, order.id, ZERO_BI, ZERO_BI, event.params.amount, event.params.costInBeans, event.block.timestamp)

    if (order.filledAmount = order.amount) {
        let market = loadPodMarketplace(event.address)

        let orderIndex = market.orders.indexOf(order.id)
        if (orderIndex !== -1) {
            market.orders.splice(orderIndex, 1)
        }
    }

    // Save the raw event data
    let id = 'podOrderFilled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodOrderFilledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.from = event.params.from.toHexString()
    rawEvent.to = event.params.to.toHexString()
    rawEvent.index = event.params.index
    rawEvent.start = event.params.start
    rawEvent.amount = event.params.amount
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

/* ======== Common Functions ======== */

function updateMarketListingBalances(
    marketAddress: Address,
    plotIndex: BigInt,
    newPodAmount: BigInt,
    cancelledPodAmount: BigInt,
    filledPodAmount: BigInt,
    filledBeanAmount: BigInt,
    timestamp: BigInt
): void {
    let market = loadPodMarketplace(marketAddress)
    let marketHourly = loadPodMarketplaceHourlySnapshot(marketAddress, market.season, timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(marketAddress, timestamp)

    // Update Listing indexes
    if (newPodAmount > ZERO_BI) {
        market.listingIndexes.push(plotIndex)
        market.listingIndexes.sort()
    }
    if (cancelledPodAmount > ZERO_BI || filledPodAmount > ZERO_BI) {
        let listingIndex = market.listingIndexes.indexOf(plotIndex)
        market.listingIndexes.splice(listingIndex, 1)
    }
    market.totalPodsListed = market.totalPodsListed.plus(newPodAmount)
    market.totalPodsAvailable = market.totalPodsAvailable.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    market.totalPodsCancelled = market.totalPodsCancelled.plus(cancelledPodAmount)
    market.totalPodsFilled = market.totalPodsFilled.plus(filledPodAmount)
    market.totalPodVolume = market.totalPodVolume.plus(filledPodAmount)
    market.totalBeanVolume = market.totalBeanVolume.plus(filledBeanAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsListed = marketHourly.newPodsListed.plus(newPodAmount)
    marketHourly.totalPodsListed = market.totalPodsListed
    marketHourly.newPodsCancelled = marketHourly.newPodsCancelled.plus(cancelledPodAmount)
    marketHourly.totalPodsCancelled = market.totalPodsCancelled
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.newPodsFilled = marketHourly.newPodsFilled.plus(filledPodAmount)
    marketHourly.totalPodsFilled = market.totalPodsFilled
    marketHourly.newPodVolume = marketHourly.newPodVolume.plus(filledPodAmount)
    marketHourly.totalPodVolume = market.totalPodVolume
    marketHourly.newBeanVolume = marketHourly.newBeanVolume.plus(filledBeanAmount)
    marketHourly.totalBeanVolume = market.totalBeanVolume
    marketHourly.timestamp = timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsListed = marketDaily.newPodsListed.plus(newPodAmount)
    marketDaily.totalPodsListed = market.totalPodsListed
    marketDaily.newPodsCancelled = marketDaily.newPodsCancelled.plus(cancelledPodAmount)
    marketDaily.totalPodsCancelled = market.totalPodsCancelled
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.plus(newPodAmount).minus(cancelledPodAmount).minus(filledPodAmount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.newPodsFilled = marketDaily.newPodsFilled.plus(filledPodAmount)
    marketDaily.totalPodsFilled = market.totalPodsFilled
    marketDaily.newPodVolume = marketDaily.newPodVolume.plus(filledPodAmount)
    marketDaily.totalPodVolume = market.totalPodVolume
    marketDaily.newBeanVolume = marketDaily.newBeanVolume.plus(filledBeanAmount)
    marketDaily.totalBeanVolume = market.totalBeanVolume
    marketDaily.timestamp = timestamp
    marketDaily.save()
}

function updateMarketOrderBalances(
    marketAddress: Address,
    orderID: string,
    newPodAmount: BigInt,
    cancelledPodAmount: BigInt,
    filledPodAmount: BigInt,
    filledBeanAmount: BigInt,
    timestamp: BigInt
): void {

    let market = loadPodMarketplace(marketAddress)
    let marketHourly = loadPodMarketplaceHourlySnapshot(marketAddress, market.season, timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(marketAddress, timestamp)

    if (newPodAmount > ZERO_BI) {
        market.orders.push(orderID)
    }
    if (cancelledPodAmount > ZERO_BI) {
        let orderIndex = market.orders.indexOf(orderID)
        market.listingIndexes.splice(orderIndex, 1)
    }
    market.totalOrdersCreated = market.totalOrdersCreated.plus(newPodAmount)
    market.totalOrdersFilled = market.totalOrdersFilled.plus(filledPodAmount)
    market.totalPodVolume = market.totalPodVolume.plus(filledPodAmount)
    market.totalBeanVolume = market.totalBeanVolume.plus(filledBeanAmount)
    market.totalOrdersCancelled = market.totalOrdersCancelled.plus(cancelledPodAmount)
    market.save()

    marketHourly.newOrdersCreated = marketHourly.newOrdersCreated.plus(newPodAmount)
    marketHourly.totalOrdersCreated = market.totalOrdersCreated
    marketHourly.newOrdersFilled = marketHourly.newOrdersFilled.plus(filledPodAmount)
    marketHourly.totalOrdersFilled = market.totalOrdersFilled
    marketHourly.newPodVolume = marketHourly.newPodVolume.plus(filledPodAmount)
    marketHourly.totalPodVolume = market.totalPodVolume
    marketHourly.newBeanVolume = marketHourly.newBeanVolume.plus(filledBeanAmount)
    marketHourly.totalBeanVolume = market.totalBeanVolume
    marketHourly.newOrdersCancelled = marketHourly.newOrdersCancelled.plus(cancelledPodAmount)
    marketHourly.totalOrdersCancelled = market.totalOrdersCancelled
    marketHourly.timestamp = timestamp
    marketHourly.save()

    marketDaily.newOrdersCreated = marketDaily.newOrdersCreated.plus(newPodAmount)
    marketDaily.totalOrdersCreated = market.totalOrdersCreated
    marketDaily.newOrdersFilled = marketDaily.newOrdersFilled.plus(filledPodAmount)
    marketDaily.totalOrdersFilled = market.totalOrdersFilled
    marketDaily.newPodVolume = marketDaily.newPodVolume.plus(filledPodAmount)
    marketDaily.totalPodVolume = market.totalPodVolume
    marketDaily.newBeanVolume = marketDaily.newBeanVolume.plus(filledBeanAmount)
    marketDaily.totalBeanVolume = market.totalBeanVolume
    marketDaily.newOrdersCancelled = marketDaily.newOrdersCancelled.plus(cancelledPodAmount)
    marketDaily.totalOrdersCancelled = market.totalOrdersCancelled
    marketDaily.timestamp = timestamp
    marketDaily.save()
}
