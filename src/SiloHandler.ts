import { AddDeposit } from '../generated/Silo-Replanted/Beanstalk'
import { ZERO_BI } from './utils/Decimals'
import { loadFarmer } from './utils/Farmer'
import { loadSilo, loadSiloHourlySnapshot } from './utils/Silo'
import { loadSiloDeposit } from './utils/SiloDeposit'

export function handleAddDeposit(event: AddDeposit): void {
    let silo = loadSilo(event.address)
    let siloHourly = loadSiloHourlySnapshot(event.address, event.params.season.toI32(), event.block.timestamp)

    silo.beanstalk = event.address.toHexString()
    silo.totalDepositedBDV = silo.totalDepositedBDV.plus(event.params.bdv)
    silo.save()

    siloHourly.hourlyDepositedBDV = siloHourly.hourlyDepositedBDV.plus(event.params.bdv)
    siloHourly.totalDepositedBDV = silo.totalDepositedBDV
    siloHourly.save()

    let farmer = loadFarmer(event.params.account)

    let deposit = loadSiloDeposit(event.params.account, event.params.token, event.params.season)
    deposit.tokenAmount = event.params.amount
    deposit.bdv = event.params.bdv
    deposit.hashes.push(event.transaction.hash.toHexString())
    deposit.createdAt = deposit.createdAt == ZERO_BI ? event.block.timestamp : deposit.createdAt
    deposit.updatedAt = event.block.timestamp
    deposit.save()
}
