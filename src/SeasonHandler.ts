import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { Incentivization } from "../generated/Field/Beanstalk";
import { SeasonSnapshot, Sunrise, Beanstalk } from "../generated/Field/Beanstalk";
import { Incentive, Beanstalk as BeanstalkEntity } from "../generated/schema";
import { updateHarvestablePlots } from "./FieldHandler";
import { loadBeanstalk } from "./utils/Beanstalk";
import { BEANSTALK } from "./utils/Constants";
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
    if (event.params.season == BigInt.fromI32(6075)) { season.price = BigDecimal.fromString('1.07') } // Replant oracle initialization
    season.timestamp = event.block.timestamp
    season.save()

    // Update field metrics
    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, field.season, event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    // -- Field level totals
    field.season = currentSeason
    field.podRate = season.beans == ZERO_BI ? ZERO_BD : toDecimal(field.totalPods, 6).div(toDecimal(season.beans, 6))
    fieldHourly.podRate = field.podRate
    fieldDaily.season = currentSeason
    fieldDaily.podRate = field.podRate

    let newIndexes = field.plotIndexes.sort()
    /*
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
    */
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
}

export function handleSeasonSnapshot(event: SeasonSnapshot): void {
    let season = loadSeason(event.address, event.params.season)
    season.price = toDecimal(event.params.price, 18)
    season.save()
}

export function handleIncentive(event: Incentivization): void {
    // This is the final function to be called during sunrise both pre and post replant
    let id = 'incentive-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let incentive = new Incentive(id)
    incentive.hash = event.transaction.hash.toHexString()
    incentive.logIndex = event.transactionLogIndex.toI32()
    incentive.protocol = event.address.toHexString()
    incentive.caller = event.params.account.toHexString()
    incentive.amount = event.params.beans
    incentive.blockNumber = event.block.number
    incentive.timestamp = event.block.timestamp
    incentive.save()

    // Update market cap for season
    let beanstalk = loadBeanstalk(event.address)
    let beanstalk_contract = Beanstalk.bind(BEANSTALK)
    let season = loadSeason(event.address, BigInt.fromI32(beanstalk.lastSeason))

    season.marketCap = season.price.times(toDecimal(season.beans))
    season.incentiveBeans = event.params.beans
    season.harvestableIndex = beanstalk_contract.harvestableIndex()
    season.save()

    updateHarvestablePlots(season.harvestableIndex, event.block.timestamp, event.block.number)
}
