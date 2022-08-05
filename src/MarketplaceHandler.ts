import { Address } from "@graphprotocol/graph-ts";
import { PodListingCancelled, PodListingCreated, PodListingFilled, PodOrderCancelled, PodOrderCreated, PodOrderFilled } from "../generated/Field/Beanstalk";
import { Plot } from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";
import { loadFarmer } from "./utils/Farmer";
import { loadPlot } from "./utils/Plot";
import { loadPodFill } from "./utils/PodFill";
import { createHistoricalPodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { createHistoricalPodOrder, loadPodOrder } from "./utils/PodOrder";
import { loadTransaction } from "./utils/Transaction";

export function handlePodListingCreated(event: PodListingCreated): void {
    let transaction = loadTransaction(event.transaction, event.block)
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
    listing.transaction = transaction.id
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

    listing.status = 'cancelled'
    listing.cancelledAmount = listing.remainingAmount
    listing.remainingAmount = ZERO_BI
    listing.save()
}

export function handlePodListingFilled(event: PodListingFilled): void {
    let transaction = loadTransaction(event.transaction, event.block)
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let listing = loadPodListing(event.params.from, event.params.index)

    market.totalPodsFilled = market.totalPodsFilled.plus(event.params.amount)
    market.totalPodsAvailable = market.totalPodsAvailable.minus(event.params.amount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsFilled = marketHourly.newPodsFilled.plus(event.params.amount)
    marketHourly.totalPodsFilled = market.totalPodsFilled
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.minus(event.params.amount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.blockNumber = event.block.number
    marketHourly.timestamp = event.block.timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsFilled = marketDaily.newPodsFilled.plus(event.params.amount)
    marketDaily.totalPodsFilled = market.totalPodsFilled
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.minus(event.params.amount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.blockNumber = event.block.number
    marketDaily.timestamp = event.block.timestamp
    marketDaily.save()

    listing.filledAmount = event.params.amount
    listing.remainingAmount = listing.remainingAmount.minus(event.params.amount)
    listing.totalFilled = listing.totalFilled.plus(event.params.amount)

    let listingIndex = market.listingIndexes.indexOf(listing.index)
    market.listingIndexes.splice(listingIndex, 1)
    if (listing.remainingAmount == ZERO_BI) {
        listing.status = 'filled-full'
    } else {
        listing.status = 'filled-partial'
        let remainingListing = loadPodListing(Address.fromString(listing.farmer), listing.index.plus(event.params.amount).plus(listing.start))

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
        remainingListing.transaction = transaction.id
        remainingListing.save()
        market.listingIndexes.push(remainingListing.index)
    }
    market.save()
    listing.save()

    let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())
    fill.listing = listing.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start
    fill.save()
}

export function handlePodOrderCreated(event: PodOrderCreated): void {

    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)
    let farmer = loadFarmer(event.params.account)

    if (order.status !== '') { createHistoricalPodOrder(order) }

    order.farmer = event.params.account.toHexString()
    order.createdAt = event.block.timestamp
    order.updatedAt = event.block.timestamp
    order.status = 'active'
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
}

export function handlePodOrderFilled(event: PodOrderFilled): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)
    let fill = loadPodFill(event.address, event.params.index, event.transaction.hash.toHexString())

    order.updatedAt = event.block.timestamp
    order.filledAmount = order.filledAmount.plus(event.params.amount)
    order.status = order.amount == order.filledAmount ? 'filled' : 'active'
    order.save()

    fill.order = order.id
    fill.from = event.params.from.toHexString()
    fill.to = event.params.to.toHexString()
    fill.amount = event.params.amount
    fill.index = event.params.index
    fill.start = event.params.start

    if (order.filledAmount = order.amount) {
        let orderIndex = market.orders.indexOf(order.id)
        if (orderIndex !== -1) {
            market.orders.splice(orderIndex, 1)
        }
    }


    market.totalOrdersFilled = market.totalOrdersFilled.plus(event.params.amount)
    market.save()

    marketHourly.newOrdersFilled = marketHourly.newOrdersFilled.plus(event.params.amount)
    marketHourly.totalOrdersFilled = market.totalOrdersFilled
    marketHourly.save()

    marketDaily.newOrdersFilled = marketDaily.newOrdersFilled.plus(event.params.amount)
    marketDaily.totalOrdersFilled = market.totalOrdersFilled
    marketDaily.save()
}

export function handlePodOrderCancelled(event: PodOrderCancelled): void {
    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    let order = loadPodOrder(event.params.id)

    order.status = order.filledAmount == ZERO_BI ? 'cancelled' : 'partial-cancelled'
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
}
