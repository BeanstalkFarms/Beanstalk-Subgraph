import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { MetapoolOracle, Reward, Soil, Incentivization } from '../generated/Season-Replanted/Beanstalk'
import { CurvePrice } from '../generated/Season-Replanted/CurvePrice'
import { SeasonSnapshot, Sunrise, Beanstalk } from "../generated/Season/Beanstalk";
import { Incentive } from "../generated/schema";
import { updateHarvestablePlots } from "./FieldHandler";
import { loadBeanstalk } from "./utils/Beanstalk";
import { Reward as RewardEntity, MetapoolOracle as MetapoolOracleEntity } from '../generated/schema'
import { BEANSTALK, CURVE_PRICE } from "./utils/Constants";
import { ONE_BI, toDecimal, ZERO_BD, ZERO_BI } from "./utils/Decimals";
import { loadField, loadFieldDaily, loadFieldHourly } from "./utils/Field";
import { expirePodListing, loadPodListing } from "./utils/PodListing";
import { loadPodMarketplace, loadPodMarketplaceDailySnapshot, loadPodMarketplaceHourlySnapshot } from "./utils/PodMarketplace";
import { loadSeason } from "./utils/Season";
import { loadSilo, loadSiloDailySnapshot, loadSiloHourlySnapshot } from "./utils/Silo";

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

export function handleReward(event: Reward): void {
    let id = 'reward-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let reward = new RewardEntity(id)
    reward.hash = event.transaction.hash.toHexString()
    reward.logIndex = event.transactionLogIndex.toI32()
    reward.protocol = event.address.toHexString()
    reward.season = event.params.season.toI32()
    reward.toField = event.params.toField
    reward.toSilo = event.params.toSilo
    reward.toFertilizer = event.params.toFertilizer
    reward.blockNumber = event.block.number
    reward.timestamp = event.block.timestamp
    reward.save()

    let season = loadSeason(event.address, event.params.season)
    season.rewardBeans = reward.toField.plus(reward.toSilo).plus(reward.toFertilizer)
    season.save()

    // Add to total Silo Bean mints

    let silo = loadSilo(event.address)
    let siloHourly = loadSiloHourlySnapshot(event.address, season.season, event.block.timestamp)
    let siloDaily = loadSiloDailySnapshot(event.address, event.block.timestamp)

    //let stalkPerBean = (silo.totalStalk.plus(silo.totalPlantableStalk)).div(event.params.toSilo)

    silo.totalBeanMints = silo.totalBeanMints.plus(event.params.toSilo)
    silo.totalPlantableStalk = silo.totalPlantableStalk.plus(event.params.toSilo)
    silo.save()

    siloHourly.totalBeanMints = silo.totalBeanMints
    siloHourly.totalPlantableStalk = silo.totalPlantableStalk
    siloHourly.hourlyBeanMints = siloHourly.hourlyBeanMints.plus(event.params.toSilo)
    siloHourly.hourlyPlantableStalkDelta = siloHourly.hourlyPlantableStalkDelta.plus(event.params.toSilo)
    //siloHourly.beansPerStalk = ONE_BI.times(BigInt.fromString('10000000000')).div(stalkPerBean)
    siloHourly.save()

    siloDaily.totalBeanMints = silo.totalBeanMints
    siloDaily.totalPlantableStalk = silo.totalPlantableStalk
    siloDaily.dailyBeanMints = siloDaily.dailyBeanMints.plus(event.params.toSilo)
    siloDaily.dailyPlantableStalkDelta = siloDaily.dailyPlantableStalkDelta.plus(event.params.toSilo)
    //siloDaily.beansPerStalk = siloDaily.beansPerStalk.plus(siloHourly.beansPerStalk)
    siloDaily.save()

    // Update active farmers with bean amounts

    let beanstalk = loadBeanstalk(BEANSTALK)

    for (let i = 0; i < beanstalk.activeFarmers.length; i++) {
        let farmerSilo = loadSilo(Address.fromString(beanstalk.activeFarmers[i]))
        let farmerHourly = loadSiloHourlySnapshot(Address.fromString(beanstalk.activeFarmers[i]), season.season, event.block.timestamp)
        let farmerDaily = loadSiloDailySnapshot(Address.fromString(beanstalk.activeFarmers[i]), event.block.timestamp)

        /*
        let totalSiloStalk = silo.totalStalk.plus(silo.totalPlantableStalk)
        let farmerPlantableStalk = (farmerSilo.totalRoots.times(totalSiloStalk).div(silo.totalRoots)).minus(farmerSilo.totalStalk)
        let newFarmerPlantableStalk = farmerPlantableStalk.minus(farmerSilo.totalPlantableStalk)

        farmerSilo.totalBeanMints = farmerSilo.totalBeanMints.plus(newFarmerPlantableStalk)
        farmerSilo.totalPlantableStalk = farmerPlantableStalk
        farmerSilo.save()

        farmerHourly.totalBeanMints = farmerSilo.totalBeanMints
        farmerHourly.totalPlantableStalk = farmerSilo.totalPlantableStalk
        farmerHourly.hourlyBeanMints = farmerHourly.hourlyBeanMints.plus(newFarmerPlantableStalk)
        farmerHourly.hourlyPlantableStalkDelta = farmerHourly.hourlyPlantableStalkDelta.plus(newFarmerPlantableStalk)
        farmerHourly.blockNumber = event.block.number
        farmerHourly.save()

        farmerDaily.totalBeanMints = farmerSilo.totalBeanMints
        farmerDaily.totalPlantableStalk = farmerSilo.totalPlantableStalk
        farmerDaily.dailyBeanMints = farmerDaily.dailyBeanMints.plus(newFarmerPlantableStalk)
        farmerDaily.dailyPlantableStalkDelta = farmerDaily.dailyPlantableStalkDelta.plus(newFarmerPlantableStalk)
        farmerDaily.blockNumber = event.block.number
        farmerDaily.save()
        */
    }
}


export function handleMetapoolOracle(event: MetapoolOracle): void {
    let id = 'metapoolOracle-' + event.transaction.hash.toHexString() + '-' + event.transactionLogIndex.toString()
    let oracle = new MetapoolOracleEntity(id)
    oracle.hash = event.transaction.hash.toHexString()
    oracle.logIndex = event.transactionLogIndex.toI32()
    oracle.protocol = event.address.toHexString()
    oracle.season = event.params.season.toI32()
    oracle.deltaB = event.params.deltaB
    oracle.balanceA = event.params.balances[0]
    oracle.balanceB = event.params.balances[1]
    oracle.blockNumber = event.block.number
    oracle.timestamp = event.block.timestamp
    oracle.save()

    let curvePrice = CurvePrice.bind(CURVE_PRICE)
    let season = loadSeason(event.address, event.params.season)
    season.price = toDecimal(curvePrice.getCurve().price, 6)
    season.deltaB = event.params.deltaB
    season.save()
}

export function handleSoil(event: Soil): void {
    // Replant sets the soil to the amount every season instead of adding new soil
    // to an existing amount.

    let field = loadField(event.address)
    let fieldHourly = loadFieldHourly(event.address, event.params.season.toI32(), event.block.timestamp)
    let fieldDaily = loadFieldDaily(event.address, event.block.timestamp)

    field.season = event.params.season.toI32()
    field.totalSoil = event.params.soil
    field.save()

    fieldHourly.totalSoil = field.totalSoil
    fieldHourly.newSoil = fieldHourly.newSoil.plus(event.params.soil)
    fieldHourly.blockNumber = event.block.number
    fieldHourly.timestamp = event.block.timestamp
    fieldHourly.save()

    fieldDaily.totalSoil = field.totalSoil
    fieldDaily.newSoil = fieldDaily.newSoil.plus(event.params.soil)
    fieldDaily.blockNumber = event.block.number
    fieldDaily.timestamp = event.block.timestamp
    fieldDaily.save()
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
