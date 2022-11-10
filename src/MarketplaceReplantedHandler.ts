import { PodListingCreated } from "../generated/Marketplace-Replanted/Beanstalk";
import { Plot, PodListingCreated as PodListingCreatedEvent } from "../generated/schema";
import { ZERO_BI } from "./utils/Decimals";
import { loadPlot } from "./utils/Plot";
import { createHistoricalPodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { loadTransaction } from "./utils/Transaction";

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
    listing.status = 'ACTIVE'
    listing.originalIndex = event.params.index
    listing.start = event.params.start
    listing.amount = event.params.amount
    listing.totalAmount = event.params.amount
    listing.remainingAmount = listing.totalAmount
    listing.pricePerPod = event.params.pricePerPod
    listing.maxHarvestableIndex = event.params.maxHarvestableIndex
    listing.mode = event.params.mode
    listing.save()

    plot.listing = listing.id
    plot.save()

    // Farmer Balances

    market.listingIndexes.push(plot.index)
    market.listingIndexes.sort()
    market.listedPods = market.listedPods.plus(event.params.amount)
    market.availableListedPods = market.availableListedPods.plus(event.params.amount)
    market.save()

    marketHourly.season = market.season
    marketHourly.deltaListedPods = marketHourly.deltaListedPods.plus(event.params.amount)
    marketHourly.listedPods = market.listedPods
    marketHourly.deltaAvailableListedPods = marketHourly.deltaAvailableListedPods.plus(event.params.amount)
    marketHourly.availableListedPods = market.availableListedPods
    marketHourly.blockNumber = event.block.number
    marketHourly.timestamp = event.block.timestamp
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.deltaListedPods = marketDaily.deltaListedPods.plus(event.params.amount)
    marketDaily.listedPods = market.listedPods
    marketDaily.deltaAvailableListedPods = marketDaily.deltaAvailableListedPods.plus(event.params.amount)
    marketDaily.availableListedPods = market.availableListedPods
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
    rawEvent.mode = event.params.mode
    rawEvent.blockNumber = event.block.number
    rawEvent.timestamp = event.block.timestamp
    rawEvent.save()
}
