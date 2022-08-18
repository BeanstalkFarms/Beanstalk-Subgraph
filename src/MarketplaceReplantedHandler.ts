import { PodListingCreated } from "../generated/Marketplace-Replanted/Beanstalk";
import { Plot } from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";
import { loadPlot } from "./utils/Plot";
import { createHistoricalPodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
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
    listing.status = 'active'
    listing.originalIndex = event.params.index
    listing.start = event.params.start
    listing.amount = event.params.amount
    listing.totalAmount = event.params.amount
    listing.remainingAmount = listing.totalAmount
    listing.pricePerPod = event.params.pricePerPod
    listing.maxHarvestableIndex = event.params.maxHarvestableIndex
    listing.mode = event.params.mode
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
