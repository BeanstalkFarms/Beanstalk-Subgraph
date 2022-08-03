import { Beanstalk } from "../generated/Diamond/Beanstalk";
import { SeasonSnapshot, Sunrise } from "../generated/Field/Beanstalk";
import { Fertilizer } from "../generated/schema";
import { BEANSTALK, DELTA_HUMIDITY, FERTILIZER, MIN_HUMIDITY } from "./utils/Constants";
import { toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { loadPlot } from "./utils/Plot";
import { expirePodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { loadSeason } from "./utils/Season";

export function handleSunrise(event: Sunrise): void {
    let currentSeason = event.params.season.toI32()
    let season = loadSeason(event.address, event.params.season)

    // Update season metrics
    //season.harvestableIndex = beanstalkContract.harvestableIndex()
    season.timestamp = event.block.timestamp
    season.save()

    // Update field metrics
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    // -- Field level totals
    field.season = currentSeason
    field.podRate = season.beans == ZERO_BI ? ZERO_BD : toDecimal(field.totalPods, 6).div(toDecimal(season.beans, 6))
    fieldHourly.season = currentSeason
    fieldHourly.podRate = field.podRate
    fieldDaily.season = currentSeason
    fieldDaily.podRate = field.podRate

    let newIndexes = field.plotIndexes.sort()

    // -- Flag plots as harvestable
    for (let i = 0; i < field.plotIndexes.length; i++) {
        if (field.plotIndexes[i] < season.harvestableIndex) {
            let plot = loadPlot(event.address, field.plotIndexes[i])
            // Insert farmer field info
            let harvestablePods = ZERO_BI
            if (plot.harvestablePods == ZERO_BI) {
                if (plot.index.plus(plot.pods) <= season.harvestableIndex) {
                    harvestablePods = plot.pods
                } else {
                    harvestablePods = season.harvestableIndex.minus(plot.index)
                }
            } else {
                if (plot.index.plus(plot.pods) <= season.harvestableIndex) {
                    harvestablePods = plot.pods.minus(plot.harvestablePods)
                } else {
                    harvestablePods = season.harvestableIndex.minus(plot.index).plus(plot.harvestablePods)
                }
            }

            plot.harvestablePods = plot.harvestablePods.plus(harvestablePods)
            plot.save()

            // Farmer totals here

            if (plot.harvestablePods == plot.pods) {
                newIndexes.shift()
            }
        } else { break }
    }

    field.plotIndexes = newIndexes

    field.save()
    fieldHourly.save()
    fieldDaily.save()

    // Marketplace Season Update

    let market = loadPodMarketplace(event.address)
    let marketHourly = loadPodMarketplaceHourlySnapshot(event.address, market.season, event.block.timestamp)
    let marketDaily = loadPodMarketplaceDailySnapshot(event.address, event.block.timestamp)
    market.season = currentSeason
    marketHourly.season = currentSeason
    marketDaily.season = currentSeason
    market.save()
    marketHourly.save()
    marketDaily.save()

    let remainingListings = market.listingIndexes

    // Cancel any pod marketplace listings beyond the index
    for (let i = 0; i < market.listingIndexes.length; i++) {
        if (market.listingIndexes[i] < season.harvestableIndex) {
            expirePodListing(event.address, event.block.timestamp, market.listingIndexes[i])
            remainingListings.shift()
        } else {
            let listing = loadPodListing(event.address, market.listingIndexes[i])
            if (listing.maxHarvestableIndex < season.harvestableIndex) {
                expirePodListing(event.address, event.block.timestamp, market.listingIndexes[i])
                let listingIndex = market.listingIndexes.indexOf(listing.index)
                remainingListings.splice(listingIndex, 1)
            }
        }
    }

    market.listingIndexes = remainingListings
    market.save()

    // Fertilizer
    let fertilizer = Fertilizer.load(FERTILIZER.toHexString())
    // Check if the diamond cut reduces Humidity to 250%
    if (fertilizer != null) {
        if (fertilizer.humidity.gt(MIN_HUMIDITY)) 
            fertilizer.humidity = fertilizer.humidity.minus(DELTA_HUMIDITY)
        fertilizer.season = currentSeason
        fertilizer.bpf = Beanstalk.bind(BEANSTALK).beansPerFertilizer()
        fertilizer.save()
    }
}

export function handleSeasonSnapshot(event: SeasonSnapshot): void {
    let season = loadSeason(event.address, event.params.season)
    season.harvestableIndex = event.params.harvestableIndex
    season.twap = toDecimal(event.params.price, 18)
    season.save()


    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    fieldHourly.snapshotIndex = event.params.podIndex
    fieldHourly.snapshotHarvestable = event.params.harvestableIndex
    fieldHourly.save()
}
