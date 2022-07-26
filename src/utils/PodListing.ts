import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PodListing } from "../../generated/schema";
import { ZERO_BI } from "./Decimals";
import { loadPlot } from "./Plot";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./PodMarketplace";

export function loadPodListing(account: Address, index: BigInt): PodListing {
    let id = account.toHexString() + '-' + index.toString()
    let listing = PodListing.load(id)
    if (listing == null) {
        listing = new PodListing(id)
        listing.plot = index.toString()
        listing.farmer = account.toHexString()
        listing.createdAt = ZERO_BI
        listing.updatedAt = ZERO_BI
        listing.status = 'active'
        listing.originalIndex = index
        listing.index = index
        listing.start = ZERO_BI
        listing.totalAmount = ZERO_BI
        listing.remainingAmount = ZERO_BI
        listing.filledAmount = ZERO_BI
        listing.totalFilled = ZERO_BI
        listing.cancelledAmount = ZERO_BI
        listing.pricePerPod = 0
        listing.maxHarvestableIndex = ZERO_BI
        listing.mode = false
        listing.save()
    }
    return listing
}

export function expirePodListing(diamondAddress: Address, timestamp: BigInt, listingIndex: BigInt): void {
    let market = loadPodMarketplace(diamondAddress)
    let marketHourly = loadPodMarketplaceHourlySnapshot(diamondAddress, timestamp)
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

    listing.status = 'expired'
    listing.remainingAmount = ZERO_BI
    listing.save()
}
