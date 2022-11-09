import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PodListing } from "../../generated/schema";
import { BEANSTALK } from "./Constants";
import { ZERO_BI } from "./Decimals";
import { loadPlot } from "./Plot";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./PodMarketplace";

export function loadPodListing(account: Address, index: BigInt): PodListing {
    let id = account.toHexString() + '-' + index.toString()
    let listing = PodListing.load(id)
    if (listing == null) {
        listing = new PodListing(id)
        listing.podMarketplace = BEANSTALK.toHexString()
        listing.historyID = ''
        listing.plot = index.toString()
        listing.farmer = account.toHexString()
        listing.createdAt = ZERO_BI
        listing.updatedAt = ZERO_BI
        listing.status = 'ACTIVE'
        listing.originalIndex = index
        listing.index = index
        listing.start = ZERO_BI
        listing.amount = ZERO_BI
        listing.totalAmount = ZERO_BI
        listing.remainingAmount = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.totalFilled = ZERO_BI
        listing.cancelledAmount = ZERO_BI
        listing.pricePerPod = 0
        listing.minFillAmount = ZERO_BI
        listing.maxHarvestableIndex = ZERO_BI
        listing.mode = 0
        listing.save()
    }
    return listing
}

export function expirePodListing(diamondAddress: Address, timestamp: BigInt, listingIndex: BigInt): void {
    let market = loadPodMarketplace(diamondAddress)
    let marketHourly = loadPodMarketplaceHourlySnapshot(diamondAddress, market.season, timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(diamondAddress, timestamp)
    //farmer info
    let plot = loadPlot(diamondAddress, listingIndex)
    let listing = loadPodListing(Address.fromString(plot.farmer), listingIndex)

    market.totalPodsExpired = market.totalPodsExpired.plus(listing.remainingAmount)
    market.totalPodsAvailable = market.totalPodsAvailable.minus(listing.remainingAmount)
    market.save()

    marketHourly.season = market.season
    marketHourly.newPodsExpired = marketHourly.newPodsExpired.plus(listing.remainingAmount)
    marketHourly.totalPodsExpired = market.totalPodsExpired
    marketHourly.newPodsAvailable = marketHourly.newPodsAvailable.minus(listing.remainingAmount)
    marketHourly.totalPodsAvailable = market.totalPodsAvailable
    marketHourly.save()

    marketDaily.season = market.season
    marketDaily.newPodsExpired = marketDaily.newPodsExpired.plus(listing.remainingAmount)
    marketDaily.totalPodsExpired = market.totalPodsExpired
    marketDaily.newPodsAvailable = marketDaily.newPodsAvailable.minus(listing.remainingAmount)
    marketDaily.totalPodsAvailable = market.totalPodsAvailable
    marketDaily.save()

    listing.status = 'EXPIRED'
    listing.remainingAmount = ZERO_BI
    listing.save()
}

export function createHistoricalPodListing(listing: PodListing): void {
    let created = false
    let id = listing.id
    for (let i = 0; !created; i++) {
        id = listing.id + '-' + i.toString()
        let newListing = PodListing.load(id)
        if (newListing == null) {
            newListing = new PodListing(id)
            newListing.podMarketplace = listing.podMarketplace
            newListing.historyID = listing.historyID
            newListing.plot = listing.plot
            newListing.farmer = listing.farmer
            newListing.createdAt = listing.createdAt
            newListing.updatedAt = listing.updatedAt
            newListing.status = listing.status
            newListing.originalIndex = listing.originalIndex
            newListing.index = listing.index
            newListing.start = listing.start
            newListing.amount = listing.amount
            newListing.totalAmount = listing.totalAmount
            newListing.remainingAmount = listing.remainingAmount
            newListing.filledAmount = listing.filledAmount
            newListing.totalFilled = listing.totalFilled
            newListing.cancelledAmount = listing.cancelledAmount
            newListing.pricePerPod = listing.pricePerPod
            newListing.minFillAmount = listing.minFillAmount
            newListing.maxHarvestableIndex = listing.maxHarvestableIndex
            newListing.mode = listing.mode
            newListing.save()
            created = true
        }
    }
}
