import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PodMarketplace, PodMarketplaceHourlySnapshot, PodMarketplaceDailySnapshot } from "../../generated/schema";
import { dayFromTimestamp, hourFromTimestamp } from "./Dates";
import { ZERO_BI } from "./Decimals";
import { loadField } from "./Field";

export function loadPodMarketplace(diamondAddress: Address): PodMarketplace {
    let marketplace = PodMarketplace.load(diamondAddress.toHexString())
    if (marketplace == null) {
        let field = loadField(diamondAddress)
        marketplace = new PodMarketplace(diamondAddress.toHexString())
        marketplace.season = field.season
        marketplace.listingIndexes = []
        marketplace.orders = []
        marketplace.totalPodsListed = ZERO_BI
        marketplace.totalPodsFilled = ZERO_BI
        marketplace.totalPodsExpired = ZERO_BI
        marketplace.totalPodsCancelled = ZERO_BI
        marketplace.totalPodsAvailable = ZERO_BI
        marketplace.totalOrdersCreated = ZERO_BI
        marketplace.totalOrdersFilled = ZERO_BI
        marketplace.totalOrdersCancelled = ZERO_BI
        marketplace.totalPodVolume = ZERO_BI
        marketplace.totalBeanVolume = ZERO_BI
        marketplace.save()
    }
    return marketplace
}

export function loadPodMarketplaceHourlySnapshot(diamondAddress: Address, timestamp: BigInt): PodMarketplaceHourlySnapshot {
    let hour = hourFromTimestamp(timestamp)
    let id = diamondAddress.toHexString() + '-' + hour.toString()
    let marketplace = loadPodMarketplace(diamondAddress)
    let snapshot = PodMarketplaceHourlySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new PodMarketplaceHourlySnapshot(id)
        snapshot.season = marketplace.season
        snapshot.podMarketplace = diamondAddress.toHexString()
        snapshot.newPodsListed = ZERO_BI
        snapshot.totalPodsListed = marketplace.totalPodsListed
        snapshot.newPodsFilled = ZERO_BI
        snapshot.totalPodsFilled = marketplace.totalPodsFilled
        snapshot.newPodsExpired = ZERO_BI
        snapshot.totalPodsExpired = marketplace.totalPodsExpired
        snapshot.newPodsCancelled = ZERO_BI
        snapshot.totalPodsCancelled = marketplace.totalPodsCancelled
        snapshot.newPodsAvailable = ZERO_BI
        snapshot.totalPodsAvailable = marketplace.totalPodsAvailable
        snapshot.newOrdersCreated = ZERO_BI
        snapshot.totalOrdersCreated = marketplace.totalOrdersCreated
        snapshot.newOrdersFilled = ZERO_BI
        snapshot.totalOrdersFilled = marketplace.totalOrdersFilled
        snapshot.newOrdersCancelled = ZERO_BI
        snapshot.totalOrdersCancelled = marketplace.totalOrdersCancelled
        snapshot.newPodVolume = ZERO_BI
        snapshot.totalPodVolume = marketplace.totalPodVolume
        snapshot.newBeanVolume = ZERO_BI
        snapshot.totalBeanVolume = marketplace.totalBeanVolume
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = timestamp
        snapshot.save()
    }
    return snapshot
}

export function loadPodMarketplaceDailySnapshot(diamondAddress: Address, timestamp: BigInt): PodMarketplaceDailySnapshot {
    let day = dayFromTimestamp(timestamp)
    let id = diamondAddress.toHexString() + '-' + day.toString()
    let marketplace = loadPodMarketplace(diamondAddress)
    let snapshot = PodMarketplaceDailySnapshot.load(id)
    if (snapshot == null) {
        snapshot = new PodMarketplaceDailySnapshot(id)
        snapshot.season = marketplace.season
        snapshot.podMarketplace = diamondAddress.toHexString()
        snapshot.newPodsListed = ZERO_BI
        snapshot.totalPodsListed = marketplace.totalPodsListed
        snapshot.newPodsFilled = ZERO_BI
        snapshot.totalPodsFilled = marketplace.totalPodsFilled
        snapshot.newPodsExpired = ZERO_BI
        snapshot.totalPodsExpired = marketplace.totalPodsExpired
        snapshot.newPodsCancelled = ZERO_BI
        snapshot.totalPodsCancelled = marketplace.totalPodsCancelled
        snapshot.newPodsAvailable = ZERO_BI
        snapshot.totalPodsAvailable = marketplace.totalPodsAvailable
        snapshot.newOrdersCreated = ZERO_BI
        snapshot.totalOrdersCreated = marketplace.totalOrdersCreated
        snapshot.newOrdersFilled = ZERO_BI
        snapshot.totalOrdersFilled = marketplace.totalOrdersFilled
        snapshot.newOrdersCancelled = ZERO_BI
        snapshot.totalOrdersCancelled = marketplace.totalOrdersCancelled
        snapshot.newPodVolume = ZERO_BI
        snapshot.totalPodVolume = marketplace.totalPodVolume
        snapshot.newBeanVolume = ZERO_BI
        snapshot.totalBeanVolume = marketplace.totalBeanVolume
        snapshot.blockNumber = ZERO_BI
        snapshot.timestamp = timestamp
        snapshot.save()
    }
    return snapshot
}
