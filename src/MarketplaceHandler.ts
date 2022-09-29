import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { PodListingCancelled, PodListingCreated, PodListingFilled, PodOrderCancelled, PodOrderCreated, PodOrderFilled } from "../generated/Field/Beanstalk";
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

export function handlePodListingCreated(event: PodListingCreated): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let plotCheck = Plot.load(event.params.index.toString())
    if (plotCheck == null) { return }
    let plot = loadPlot(event.address, event.params.index)
    // Farmer Balances
    let listing = loadPodListing(event.params.account, event.params.index)

    if (listing.createdAt !== ZERO_BI) {
        createHistoricalPodListing(listing)
        listing.createdAt = ZERO_BI
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
    listing.maxHarvestableIndex = event.params.maxHarvestableIndex
    listing.mode = event.params.toWallet === true ? 0 : 1
    listing.save()

    plot.listing = listing.id
    plot.save()

    // Farmer Balances

    market.listingIndexes.push(plot.index)
    market.listingIndexes.sort()
    market.totalPodsListed = market.totalPodsListed.plus(event.params.amount)
    market.totalPodsAvailable = market.totalPodsAvailable.plus(event.params.amount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsListed = marketHourly.newPodsListed.plus(event.params.amount)
    marketHourly.totalPodsListed = market.totalPodsListed
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.plus(event.params.amount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.blockNumber = event.block.number
    marketHourly.timestamp = event.block.timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsListed = marketDaily.newPodsListed.plus(event.params.amount)
    marketDaily.totalPodsListed = market.totalPodsListed
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.plus(event.params.amount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.blockNumber = event.block.number
    marketDaily.timestamp = event.block.timestamp
    marketDaily.save()

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
    rawEvent.mode = event.params.toWallet
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

export function handlePodListingCancelled(event: PodListingCancelled): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    //farmer info
    let listing = loadPodListing(event.params.account, event.params.index)

    market.totalPodsCancelled = market.totalPodsCancelled.plus(listing.remainingAmount)
    market.totalPodsAvailable = market.totalPodsAvailable.minus(listing.remainingAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsCancelled = marketHourly.newPodsCancelled.plus(listing.remainingAmount)
    marketHourly.totalPodsCancelled = market.totalPodsCancelled
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.minus(listing.remainingAmount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.blockNumber = event.block.number
    marketHourly.timestamp = event.block.timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsCancelled = marketDaily.newPodsCancelled.plus(listing.remainingAmount)
    marketDaily.totalPodsCancelled = market.totalPodsCancelled
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.minus(listing.remainingAmount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.blockNumber = event.block.number
    marketDaily.timestamp = event.block.timestamp
    marketDaily.save()

    listing.status = 'CANCELLED'
    listing.cancelledAmount = listing.remainingAmount
    listing.remainingAmount = ZERO_BI
    listing.updatedAt = event.block.timestamp
    listing.save()

    // Save the raw event data
    let id = 'podListingCancelled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodListingCancelledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = listing.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.index = event.params.index
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}

export function handlePodListingFilled(event: PodListingFilled): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let listing = loadPodListing(event.params.from, event.params.index)

    let beanAmount = BigInt.fromI32(listing.pricePerPod).times(event.params.amount).div(BigInt.fromI32(1000000))

    market.totalPodsFilled = market.totalPodsFilled.plus(event.params.amount)
    market.totalPodsAvailable = market.totalPodsAvailable.minus(event.params.amount)
    market.totalPodVolume = market.totalPodVolume.plus(event.params.amount)
    market.totalBeanVolume = market.totalBeanVolume.plus(beanAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsFilled = marketHourly.newPodsFilled.plus(event.params.amount)
    marketHourly.totalPodsFilled = market.totalPodsFilled
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.minus(event.params.amount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.newPodVolume = marketHourly.newPodVolume.plus(event.params.amount)
    marketHourly.totalPodVolume = market.totalPodVolume
    marketHourly.newBeanVolume = marketHourly.newBeanVolume.plus(beanAmount)
    marketHourly.totalBeanVolume = market.totalBeanVolume
    marketHourly.blockNumber = event.block.number
    marketHourly.timestamp = event.block.timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsFilled = marketDaily.newPodsFilled.plus(event.params.amount)
    marketDaily.totalPodsFilled = market.totalPodsFilled
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.minus(event.params.amount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.newPodVolume = marketDaily.newPodVolume.plus(event.params.amount)
    marketDaily.totalPodVolume = market.totalPodVolume
    marketDaily.newBeanVolume = marketDaily.newBeanVolume.plus(beanAmount)
    marketDaily.totalBeanVolume = market.totalBeanVolume
    marketDaily.blockNumber = event.block.number
    marketDaily.timestamp = event.block.timestamp
    marketDaily.save()

    listing.filledAmount = event.params.amount
    listing.remainingAmount = listing.remainingAmount.minus(event.params.amount)
    listing.totalFilled = listing.totalFilled.plus(event.params.amount)

    let originalHistoryID = listing.historyID
    let listingIndex = market.listingIndexes.indexOf(listing.index)
    market.listingIndexes.splice(listingIndex, 1)
    if (listing.remainingAmount == ZERO_BI) {
        listing.status = 'FILLED'
    } else {
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
    market.save()
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

export function handlePodOrderCreated(event: PodOrderCreated): void {

    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)
    let farmer = loadFarmer(event.params.account)

    if (order.status != '') { createHistoricalPodOrder(order) }

    order.historyID = order.id + '-' + event.block.timestamp.toString()
    order.farmer = event.params.account.toHexString()
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp
    order.status = 'ACTIVE'
    order.amount = event.params.amount
    order.filledAmount = ZERO_BI
    order.maxPlaceInLine = event.params.maxPlaceInLine
    order.pricePerPod = event.params.pricePerPod
    order.save()

    market.totalOrdersCreated = market.totalOrdersCreated.plus(event.params.amount)
    market.orders.push(order.id)
    market.save()

    marketHourly.newOrdersCreated = marketHourly.newOrdersCreated.plus(event.params.amount)
    marketHourly.totalOrdersCreated = market.totalOrdersCreated
    marketHourly.save()

    marketDaily.newOrdersCreated = marketDaily.newOrdersCreated.plus(event.params.amount)
    marketDaily.totalOrdersCreated = market.totalOrdersCreated
    marketDaily.save()

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

export function handlePodOrderFilled(event: PodOrderFilled): void {

    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)
    let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())

    let beanAmount = BigInt.fromI32(order.pricePerPod).times(event.params.amount).div(BigInt.fromI32(1000000))

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

    if (order.filledAmount = order.amount) {
        let orderIndex = market.orders.indexOf(order.id)
        if (orderIndex !== -1) {
            market.orders.splice(orderIndex, 1)
        }
    }


    market.totalOrdersFilled = market.totalOrdersFilled.plus(event.params.amount)
    market.totalPodVolume = market.totalPodVolume.plus(event.params.amount)
    market.totalBeanVolume = market.totalBeanVolume.plus(beanAmount)
    market.save()

    marketHourly.newOrdersFilled = marketHourly.newOrdersFilled.plus(event.params.amount)
    marketHourly.totalOrdersFilled = market.totalOrdersFilled
    marketHourly.newPodVolume = marketHourly.newPodVolume.plus(event.params.amount)
    marketHourly.totalPodVolume = market.totalPodVolume
    marketHourly.newBeanVolume = marketHourly.newBeanVolume.plus(beanAmount)
    marketHourly.totalBeanVolume = market.totalBeanVolume
    marketHourly.save()

    marketDaily.newOrdersFilled = marketDaily.newOrdersFilled.plus(event.params.amount)
    marketDaily.totalOrdersFilled = market.totalOrdersFilled
    marketDaily.newPodVolume = marketDaily.newPodVolume.plus(event.params.amount)
    marketDaily.totalPodVolume = market.totalPodVolume
    marketDaily.newBeanVolume = marketDaily.newBeanVolume.plus(beanAmount)
    marketDaily.totalBeanVolume = market.totalBeanVolume
    marketDaily.save()

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

export function handlePodOrderCancelled(event: PodOrderCancelled): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)

    order.status = order.filledAmount == ZERO_BI ? 'CANCELLED' : 'CANCELLED_PARTIAL'
    order.updatedAt = event.block.timestamp
    order.save()

    let orderIndex = market.orders.indexOf(order.id)
    if (orderIndex !== -1) {
        market.listingIndexes.splice(orderIndex, 1)
    }

    market.totalOrdersCancelled = market.totalOrdersCancelled.plus(order.amount).minus(order.filledAmount)
    market.save()

    marketHourly.newOrdersCancelled = marketHourly.newOrdersCancelled.plus(order.amount).minus(order.filledAmount)
    marketHourly.totalOrdersCancelled = market.totalOrdersCancelled
    marketHourly.save()

    marketDaily.newOrdersCancelled = marketDaily.newOrdersCancelled.plus(order.amount).minus(order.filledAmount)
    marketDaily.totalOrdersCancelled = market.totalOrdersCancelled
    marketDaily.save()

    // Save the raw event data
    let id = 'podOrderCancelled-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    let rawEvent = new PodOrderCancelledEvent(id)
    rawEvent.hash = event.transaction.hash.toHexString()
    rawEvent.logIndex = event.logIndex.toI32()
    rawEvent.protocol = event.address.toHexString()
    rawEvent.historyID = order.historyID
    rawEvent.account = event.params.account.toHexString()
    rawEvent.orderId = event.params.id.toHexString()
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}
