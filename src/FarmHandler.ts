import { Address, BigInt } from "@graphprotocol/graph-ts";
import { InternalBalanceChanged } from "../generated/Farm/Beanstalk";
import { loadBeanstalk } from "./utils/Beanstalk";
import { BEANSTALK } from "./utils/Constants";
import { loadSiloAsset, loadSiloAssetDailySnapshot, loadSiloAssetHourlySnapshot } from "./utils/SiloAsset";
import { loadFarmer } from "./utils/Farmer";


export function handleInternalBalanceChanged(event: InternalBalanceChanged): void {

    let beanstalk = loadBeanstalk(BEANSTALK)

    loadFarmer(event.params.user)

    updateFarmTotals(BEANSTALK, event.params.token, beanstalk.lastSeason, event.params.delta, event.block.number, event.block.timestamp)
    updateFarmTotals(event.params.user, event.params.token, beanstalk.lastSeason, event.params.delta, event.block.number, event.block.timestamp)

}

function updateFarmTotals(account: Address, token: Address, season: i32, delta: BigInt, blockNumber: BigInt, timestamp: BigInt): void {
    let asset = loadSiloAsset(account, token)
    let assetHourly = loadSiloAssetHourlySnapshot(account, token, season, timestamp)
    let assetDaily = loadSiloAssetDailySnapshot(account, token, timestamp)

    asset.totalFarmAmount = asset.totalFarmAmount.plus(delta)
    asset.save()

    assetHourly.totalFarmAmount = asset.totalFarmAmount
    assetHourly.hourlyFarmAmountDelta = assetHourly.hourlyFarmAmountDelta.plus(delta)
    assetHourly.blockNumber = blockNumber
    assetHourly.lastUpdated = timestamp
    assetHourly.save()

    assetDaily.season = season
    assetDaily.totalFarmAmount = asset.totalFarmAmount
    assetDaily.dailyFarmAmountDelta = assetDaily.dailyFarmAmountDelta.plus(delta)
    assetDaily.blockNumber = blockNumber
    assetDaily.lastUpdated = timestamp
    assetDaily.save()
}
