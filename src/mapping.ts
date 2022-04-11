import { BigInt, Address, Bytes, BigDecimal, store } from "@graphprotocol/graph-ts"
import {
  Beanstalk,
  BeanClaim,
  EtherClaim,
  Harvest,
  LPClaim,
  DiamondCut,
  PlotTransfer,
  PodApproval,
  Sow,
  Commit,
  Incentivization,
  Pause,
  Proposal,
  Unpause,
  Unvote,
  Vote,
  Incentivization1,
  SeasonOfPlenty,
  SeasonSnapshot,
  Sunrise,
  SupplyDecrease,
  SupplyIncrease,
  SupplyNeutral,
  WeatherChange,
  BeanDeposit as BeanDepositEvent,
  BeanRemove,
  BeanWithdraw,
  LPDeposit as LPDepositEvent,
  LPRemove,
  LPWithdraw,
} from "../generated/Beanstalk/Beanstalk"
import { Transfer } from "../generated/Bean/Bean"
import { UniswapV2Pair, Approval, Mint, Burn, Sync, Swap } from "../generated/BeanUniswapV2Pair/UniswapV2Pair"
import { Pair, Plot, Account, State, Season, BeanDeposit, BeanWithdrawal, LPDeposit, LPWithdrawal, Transaction } from "../generated/schema"
import { ADDRESS_ZERO, ZERO_BI, ONE_BI, ZERO_BD, BI_6, BI_10, BI_18, convertIntegerToDecimal } from "./helpers"

let SEASONS_PER_WEEK = BigInt.fromI32(168)
let SEASONS_PER_30DAYS = BigInt.fromI32(720)
let BEANSTALK_ADDRESS = Address.fromString('0xc1e088fc1323b20bcbee9bd1b9fc9546db5624c5')
let BEAN_PAIR_ADDRESS = Address.fromString('0x87898263b6c5babe34b4ec53f22d98430b91e371')
let USDC_PAIR_ADDRESS = Address.fromString('0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc')

let BEAN_ADDRESS = Address.fromString('0xdc59ac4fefa32293a95889dc396682858d52e5db')

let DEVELOPMENT_BUDGET_ADDRESS = Address.fromString('0x83A758a6a24FE27312C1f8BDa7F3277993b64783')
let MARKETING_BUDGET_ADDRESS = Address.fromString('0xAA420e97534aB55637957e868b658193b112A551')

  export function handleApproval(event: Approval): void {}

  export function handleBurn(event: Burn): void {}
  
  export function handleMint(event: Mint): void {}

  export function handleSwap(event: Swap): void {
    let pair = getPair(event.address)
    let season = getCurrentSeason()
    let ethPrice = getEthPrice()

    let account = getAccount(event.transaction.from)

    // Buying
    if (event.params.amount0In.gt(ZERO_BI)) {
      let ethSold = convertIntegerToDecimal(event.params.amount0In, pair.decimals0)
      let beansBought = convertIntegerToDecimal(event.params.amount1Out, pair.decimals1)
      season.boughtBeans = season.boughtBeans.plus(beansBought)
      season.newBoughtBeans = season.newBoughtBeans.plus(beansBought)
      season.newBoughtBeansETH = season.newBoughtBeansETH.plus(ethSold)
      season.newBoughtBeansUSD = season.newBoughtBeansUSD.plus(ethSold.times(ethPrice))

      if (account.claimedSopEth.gt(ZERO_BD)) {
        if (ethSold.gt(account.claimedSopEth)) {
          season.reinvestedSopEth = season.reinvestedSopEth.plus(account.claimedSopEth)
          account.claimedSopEth = ZERO_BD
        } else {
          season.reinvestedSopEth = season.reinvestedSopEth.plus(ethSold)
          account.claimedSopEth = account.claimedSopEth.minus(ethSold)
        }
        account.save()
      }
    } else {
      let ethBought = convertIntegerToDecimal(event.params.amount0Out, pair.decimals0)
      let beansSold = convertIntegerToDecimal(event.params.amount1In, pair.decimals1)
      season.soldBeans = season.soldBeans.plus(beansSold)
      season.newSoldBeans = season.newSoldBeans.plus(beansSold)
      season.newSoldBeansETH = season.newSoldBeansETH.plus(ethBought)
      season.newSoldBeansUSD = season.newSoldBeansUSD.plus(ethBought.times(ethPrice))
    }

    season.save()
    
  }

export function handleSync(event: Sync): void {
  let pair = getPair(event.address)
  let season = getCurrentSeason()
  let beans = convertIntegerToDecimal(event.params.reserve1, pair.decimals1)
  let eth = convertIntegerToDecimal(event.params.reserve0, pair.decimals0)
  pair.reserve0 = eth
  pair.reserve1 = beans
  season.pooledBeans = beans
  season.pooledEth = eth
  season.save()
  pair.save()

}

export function handleEtherClaim(event: EtherClaim): void {
  let season = getCurrentSeason()
  let account = getAccount(event.params.account)

  let eth = convertIntegerToDecimal(event.params.ethereum, BI_18)
  season.sopEth = season.sopEth.minus(eth)
  season.claimedSopEth = season.claimedSopEth.plus(eth)
  season.save()

  account.claimedSopEth = account.claimedSopEth.plus(eth)
  account.save()
}

export function handleDiamondCut(event: DiamondCut): void {}

export function handlePlotTransfer(event: PlotTransfer): void {}

export function handlePodApproval(event: PodApproval): void {}

export function handleBeanDeposit(event: BeanDepositEvent): void {
  let season = getCurrentSeason()
  
  let account = getAccount(event.params.account)
  let deposit = getBeanDeposit(account, season)
  let beans = convertIntegerToDecimal(event.params.beans, BI_6)
  deposit.beans = deposit.beans.plus(beans)
  deposit.save()

  account.depositedBeans = account.depositedBeans.plus(beans)
  account.save()

  let txn = getTransaction(event.transaction.hash)

  if (txn.beansToBeanstalk == beans) {
    season.depositedBeans = season.depositedBeans.plus(beans)
    season.newDepositedBeans = season.newDepositedBeans.plus(beans)
    deposit.depositedBeans = deposit.depositedBeans.plus(beans)
  } else {
    deposit.farmedBeans = deposit.farmedBeans.plus(beans)
  }

  season.save()
}

export function handleBeanRemove(event: BeanRemove): void {
  let account = getAccount(event.params.account)
  let crates = event.params.crates
  let crateBeans = event.params.crateBeans
  for (let i = 0; i < crates.length; i++) {
    let season = getSeason(crates[i])
    let deposit = getBeanDeposit(account, season)
    let beans = convertIntegerToDecimal(crateBeans[i], BI_6)
    deposit.beans = deposit.beans.minus(beans)
    deposit.save()
  }

  let beans = convertIntegerToDecimal(event.params.beans, BI_6)
  account.depositedBeans = account.depositedBeans.minus(beans)
  account.save()

  

  let season = getCurrentSeason()
  // Seperate Bean Crates that were misallocated were fixed in this transaction.
  if (event.transaction.hash.toHexString() == '0x8dce98fcf92215575c6fcd3b948ec64395399e5efd6cdcc23509df9a94da59b6') {
    return
  }
  
  season.depositedBeans = season.depositedBeans.minus(beans)
  season.newRemovedBeans = season.newRemovedBeans.plus(beans)
  season.save()
}

export function handleBeanWithdraw(event: BeanWithdraw): void {
  let account = getAccount(event.params.account)
  let season = getSeason(event.params.season)
  let withdrawal = getBeanWithdrawal(account, season)
  let beans = convertIntegerToDecimal(event.params.beans, BI_6)
  withdrawal.beans = withdrawal.beans.plus(beans)
  withdrawal.save()

  account.withdrawnBeans = account.withdrawnBeans.plus(beans)
  account.save()

  season = getCurrentSeason()
  season.withdrawnBeans = season.withdrawnBeans.plus(beans)
  season.newWithdrawnBeans = season.newWithdrawnBeans.plus(beans)
  season.save()
}

export function handleBeanClaim(event: BeanClaim) : void {
  let account = getAccount(event.params.account)
  let withdrawals = event.params.withdrawals
  for (let i = 0; i < withdrawals.length; i++) {
    let season = getSeason(withdrawals[i])
    let withdrawal = getBeanWithdrawal(account, season)
    withdrawal.beans = ZERO_BD
    withdrawal.save()
  }

  let beans = convertIntegerToDecimal(event.params.beans, BI_6)
  account.withdrawnBeans = account.withdrawnBeans.minus(beans)
  account.save()

  let season = getCurrentSeason()
  season.claimableBeans = season.claimableBeans.minus(beans)
  season.save()
}

export function handleLPDeposit(event: LPDepositEvent): void {
  let state = State.load("0")
  if (state == null) return

  let season = getCurrentSeason()
  let account = getAccount(event.params.account)
  let deposit = getLPDeposit(account, season)
  let lp = convertIntegerToDecimal(event.params.lp, BI_18)
  deposit.lp = deposit.lp.plus(lp)
  deposit.save()

  account.depositedLP = account.depositedLP.plus(lp)
  account.save()
  
  season.newDepositedLP = season.newDepositedLP.plus(lp)
  season.depositedLP = season.depositedLP.plus(lp)
  season.save()
}

export function handleLPRemove(event: LPRemove) : void {
  let account = getAccount(event.params.account)
  let crates = event.params.crates
  let lps = event.params.crateLP
  for (let i = 0; i < event.params.crates.length; i++) {
    let season = getSeason(crates[i])
    let deposit = getLPDeposit(account, season)
    deposit.lp = deposit.lp.minus(convertIntegerToDecimal(lps[i], BI_18))
    deposit.save()
  }

  let lp = convertIntegerToDecimal(event.params.lp, BI_18)

  account.depositedLP = account.depositedLP.minus(lp)
  account.save()

  let season = getCurrentSeason()
  season.depositedLP = season.depositedLP.minus(lp)
  season.newRemovedLP = season.newRemovedLP.plus(lp)
  season.save()
}

export function handleLPWithdraw(event: LPWithdraw): void {
  let season = getSeason(event.params.season)
  let account = getAccount(event.params.account)
  let withdrawal = getLPWithdrawal(account, season)
  let lp = convertIntegerToDecimal(event.params.lp, BI_18)
  withdrawal.lp = withdrawal.lp.plus(lp)
  withdrawal.save()

  account.withdrawnLP = account.withdrawnLP.plus(lp)
  account.save()

  season = getCurrentSeason()
  season.withdrawnLP = season.withdrawnLP.plus(lp)
  season.newWithdrawnLP = season.newWithdrawnLP.plus(lp)
  season.save()
}

export function handleLPClaim(event: LPClaim) : void {
  let account = getAccount(event.params.account)
  let withdrawals = event.params.withdrawals
  for (let i = 0; i < withdrawals.length; i++) {
    let season = getSeason(withdrawals[i])
    let withdrawal = getLPWithdrawal(account, season)
    withdrawal.lp = ZERO_BD
    withdrawal.save()
  }

  let lp = convertIntegerToDecimal(event.params.lp, BI_18)

  account.save()

  let season = getCurrentSeason()
  season.claimableLP = season.claimableLP.minus(lp)
  season.save()
}

export function handleSow(event: Sow): void {
  let season = getCurrentSeason()
  let account = getAccount(event.params.account)

  let pods = convertIntegerToDecimal(event.params.pods, BI_6)

  let plot = new Plot(convertIntegerToDecimal(event.params.index, BI_6).toString())
  plot.txn = event.transaction.hash
  plot.account = account.id
  plot.index = convertIntegerToDecimal(event.params.index, BI_6)
  let beans = convertIntegerToDecimal(event.params.beans, BI_6)
  plot.beans = beans
  plot.pods = pods
  let w = event.params.pods.times(BigInt.fromI32(100)).div(event.params.beans).minus(ONE_BI)
  plot.weather = w.toI32()
  plot.timestamp = event.block.timestamp
  plot.season = season.id
  plot.harvested = false
  plot.save()

  if (!account.sown) {
    account.sown = true
    season.numberOfSowers += 1
  }
  account.pods = account.pods.plus(pods)
  account.save()

  season.sownBeans = season.sownBeans.plus(beans)
  season.newSownBeans = season.newSownBeans.plus(beans);
  season.numberOfSows += 1
  season.pods = season.pods.plus(pods)
  season.newPods = season.newPods.plus(pods)
  season.soil = season.soil.minus(beans)
  season.podIndex = season.podIndex.plus(pods)
  season.save()
}

export function handleHarvest(event: Harvest): void {
  event.params.plots.forEach((p) => {
    let plot = Plot.load(convertIntegerToDecimal(p, BI_6).toString())!
    if (plot == null) return
    plot.harvested = true
    plot.save()
  })

  let season = getCurrentSeason()
  let pods = convertIntegerToDecimal(event.params.beans, BI_6)
  season.harvestableBeans = season.harvestableBeans.minus(pods)
  season.save()
}

export function handleSeasonSnapshot(event: SeasonSnapshot) : void {
  let season = event.params.season
  let state = getState()
  state.season = event.params.season
  state.save()

  let snapshot = getSeason(event.params.season)
  snapshot.timestamp = event.block.timestamp
  snapshot.price = convertIntegerToDecimal(event.params.price, BI_18)
  snapshot.stalk = convertIntegerToDecimal(event.params.stalk, BI_10)
  snapshot.seeds = convertIntegerToDecimal(event.params.seeds, BI_10)

  let contract = Beanstalk.bind(event.address)
  snapshot.weather = contract.getYield()
  snapshot.depositedBeans = convertIntegerToDecimal(contract.totalDepositedBeans(), BI_6)

  let lastSeason = event.params.season.minus(ONE_BI)
  let lastSnapshot = getSeason(lastSeason)

  snapshot.lp = convertIntegerToDecimal(contract.totalDepositedLP().plus(contract.totalWithdrawnLP()), BI_18)

  if (lastSnapshot == null) {
    snapshot.save()
    return
  }
  lastSnapshot.save()

  snapshot.depositedBeans = lastSnapshot.depositedBeans
  snapshot.withdrawnBeans = lastSnapshot.withdrawnBeans
  snapshot.claimableBeans = lastSnapshot.claimableBeans
  snapshot.budgetBeans = lastSnapshot.budgetBeans
  snapshot.pooledBeans = lastSnapshot.pooledBeans
  snapshot.beans = lastSnapshot.beans

  snapshot.depositedLP = lastSnapshot.depositedLP
  snapshot.withdrawnLP = lastSnapshot.withdrawnLP
  snapshot.claimableLP = lastSnapshot.claimableLP
  snapshot.lp = lastSnapshot.lp

  snapshot.pooledEth = lastSnapshot.pooledEth

  snapshot.reinvestedSopEth = lastSnapshot.reinvestedSopEth
  snapshot.claimedSopEth = lastSnapshot.claimedSopEth
  snapshot.sopEth = lastSnapshot.sopEth
  snapshot.cumulativeSopEth = lastSnapshot.cumulativeSopEth
  snapshot.pods = lastSnapshot.pods
  snapshot.harvestedPods = lastSnapshot.harvestedPods
  snapshot.cumulativeFarmableBeansPerLP = lastSnapshot.cumulativeFarmableBeansPerLP
  snapshot.cumulativeHarvestableBeansPerLP = lastSnapshot.cumulativeHarvestableBeansPerLP
  snapshot.harvestableBeans = lastSnapshot.harvestableBeans
  snapshot.numberOfSowers = lastSnapshot.numberOfSowers
  snapshot.numberOfSows = lastSnapshot.numberOfSows
  snapshot.sownBeans = lastSnapshot.sownBeans
  snapshot.podIndex = lastSnapshot.podIndex
  snapshot.soil = lastSnapshot.soil
  snapshot.soldBeans = lastSnapshot.soldBeans
  snapshot.boughtBeans = lastSnapshot.boughtBeans

  if (season.gt(BigInt.fromI32(25))) {
    let withdrawnS = season.minus(BigInt.fromI32(25))
    let withdrawnSeason = Season.load(withdrawnS.toString())!
    if (withdrawnSeason != null) {
      snapshot.claimableBeans = snapshot.claimableBeans.plus(withdrawnSeason.newWithdrawnBeans)
      snapshot.withdrawnBeans = snapshot.withdrawnBeans.minus(withdrawnSeason.newWithdrawnBeans)
      snapshot.claimableLP = snapshot.claimableLP.plus(withdrawnSeason.newWithdrawnLP)
      snapshot.withdrawnLP = snapshot.withdrawnLP.minus(withdrawnSeason.newWithdrawnLP)
    }
  }

  snapshot.save()
}

function getAccount(address : Address) : Account {
  let account = Account.load(address.toHex())
  if (account == null) {
    let account = new Account(address.toHex())
    account.depositedBeans = ZERO_BD
    account.depositedLP = ZERO_BD
    account.withdrawnBeans = ZERO_BD
    account.withdrawnLP = ZERO_BD
    account.pods = ZERO_BD
    account.claimedSopEth = ZERO_BD
    account.beans = ZERO_BD
    account.sown = false
    account.save()
    return account
  }
  return account as Account
}

function getBeanDeposit(account: Account, season: Season) : BeanDeposit {
  let id = account.id.toString().concat('-').concat(season.id.toString())
  let deposit = BeanDeposit.load(id)
  if (deposit != null) {
    return deposit as BeanDeposit
  }
  deposit = new BeanDeposit(id)
  deposit.account = account.id
  deposit.season = season.id
  deposit.beans = ZERO_BD
  deposit.farmedBeans = ZERO_BD
  deposit.depositedBeans = ZERO_BD
  return deposit as BeanDeposit
}


function getBeanWithdrawal(account : Account, season : Season) : BeanWithdrawal {
  let id = account.id.toString().concat('-').concat(season.id.toString())
  let withdrawal = BeanWithdrawal.load(id)
  if (withdrawal != null) return withdrawal as BeanWithdrawal
  withdrawal = new BeanWithdrawal(id)
  withdrawal.account = account.id
  withdrawal.season = season.id
  withdrawal.beans = ZERO_BD
  return withdrawal as BeanWithdrawal
}

function getLPDeposit(account: Account, season: Season) : LPDeposit {
  let id = account.id.toString().concat('-').concat(season.id.toString())
  let deposit = LPDeposit.load(id)
  if (deposit != null) return deposit as LPDeposit
  deposit = new LPDeposit(id)
  deposit.account = account.id
  deposit.season = season.id
  deposit.lp = ZERO_BD
  return deposit as LPDeposit
}

function getLPWithdrawal(account : Account, season : Season) : LPWithdrawal {
  let id = account.id.toString().concat('-').concat(season.id.toString())
  let withdrawal = LPWithdrawal.load(id)
  if (withdrawal != null) return withdrawal as LPWithdrawal
  withdrawal = new LPWithdrawal(id)
  withdrawal.account = account.id
  withdrawal.season = season.id
  withdrawal.lp = ZERO_BD
  return withdrawal as LPWithdrawal
}

function getState(): State {
  let state = State.load("0")
  if (state == null) {
    let state = new State("0")
    return state
  }
  return state as State
}

function getCurrentSeason() : Season {
  let state = State.load("0")
  if (state == null) return getSeason(ONE_BI)
  return getSeason(state.season)

}

function setAverageHistoricalBeans(season: Season): Season {
  let averages = getAverageHistoricalBeans(season, SEASONS_PER_WEEK)
  let beans: BigDecimal = averages[0]
  season.farmableBeansPerSeason7 = averages[0]
  season.harvestableBeansPerSeason7 = averages[1]

  averages = getAverageHistoricalBeans(season, SEASONS_PER_30DAYS)
  season.farmableBeansPerSeason30 = averages[0]
  season.harvestableBeansPerSeason30 = averages[1]
  return season
}


function getAverageHistoricalBeans(season: Season, seasons: BigInt) : BigDecimal[] {
  let endSeasonNum = BigInt.fromString(season.id)
  let startSeasonNum = endSeasonNum.minus(seasons)
  if (startSeasonNum.lt(ONE_BI)) startSeasonNum = ONE_BI
  let startSeason = getSeason(startSeasonNum)
  let seasonsBD = endSeasonNum.minus(startSeasonNum).toBigDecimal()
  let farmableBeansPerLP = season.cumulativeFarmableBeansPerLP.minus(startSeason.cumulativeFarmableBeansPerLP).div(seasonsBD)
  let harvestableBeansPerLP = season.cumulativeHarvestableBeansPerLP.minus(startSeason.cumulativeHarvestableBeansPerLP).div(seasonsBD)
  let averageFarmableBeans = farmableBeansPerLP.times(season.lp)
  let averageHarvestableBeans = harvestableBeansPerLP.times(season.lp)
  return [averageFarmableBeans, averageHarvestableBeans]
}

function getSeason(s: BigInt): Season {
  let season = Season.load(s.toString())
  if (season != null) return season as Season
  season = new Season(s.toString())
  season.timestamp = ZERO_BI
  season.podIndex = ZERO_BD
  season.price = ZERO_BD
  season.weather = ZERO_BI
  season.numberOfSows = 0
  season.numberOfSowers = 0
  season.newSoil = ZERO_BD
  season.soil = ZERO_BD
  season.newSownBeans = ZERO_BD
  season.sownBeans = ZERO_BD
  season.newDepositedBeans = ZERO_BD
  season.depositedBeans = ZERO_BD
  season.newRemovedBeans = ZERO_BD
  season.newWithdrawnBeans = ZERO_BD
  season.withdrawnBeans = ZERO_BD
  season.claimableBeans = ZERO_BD
  season.budgetBeans = ZERO_BD
  season.pooledBeans = ZERO_BD
  season.beans = ZERO_BD
  season.newDepositedLP = ZERO_BD
  season.depositedLP = ZERO_BD
  season.newRemovedLP = ZERO_BD
  season.newWithdrawnLP = ZERO_BD
  season.withdrawnLP = ZERO_BD
  season.claimableLP = ZERO_BD
  season.pods = ZERO_BD
  season.harvestableBeans = ZERO_BD
  season.newPods = ZERO_BD
  season.newFarmableBeans = ZERO_BD
  season.newHarvestablePods = ZERO_BD
  season.harvestedPods = ZERO_BD
  season.sopEth = ZERO_BD
  season.newSopEth = ZERO_BD
  season.cumulativeSopEth = ZERO_BD
  season.reinvestedSopEth = ZERO_BD
  season.claimedSopEth = ZERO_BD
  season.stalk = ZERO_BD
  season.seeds = ZERO_BD
  season.cumulativeFarmableBeansPerLP = ZERO_BD
  season.cumulativeHarvestableBeansPerLP = ZERO_BD
  season.farmableBeansPerSeason7 = ZERO_BD
  season.farmableBeansPerSeason30 = ZERO_BD
  season.harvestableBeansPerSeason7 = ZERO_BD
  season.harvestableBeansPerSeason30 = ZERO_BD
  season.lp = ZERO_BD
  season.soldBeans = ZERO_BD
  season.newSoldBeans = ZERO_BD
  season.newSoldBeansETH = ZERO_BD
  season.newSoldBeansUSD = ZERO_BD
  season.boughtBeans = ZERO_BD
  season.newBoughtBeans = ZERO_BD
  season.newBoughtBeansETH = ZERO_BD
  season.newBoughtBeansUSD = ZERO_BD
  season.soldBeans = ZERO_BD
  season.pooledEth = ZERO_BD
  season.save()
  return season as Season
}

function getTransaction(hash: Bytes): Transaction {
  let txn = Transaction.load(hash.toHex())
  if (txn != null) return txn as Transaction
  txn = new Transaction(hash.toHex())
  txn.beansToBeanstalk = ZERO_BD
  txn.beansFromBeanstalk = ZERO_BD
  return txn as Transaction
}

export function handleCommit(event: Commit): void {}

export function handleIncentivization(event: Incentivization): void {}

export function handlePause(event: Pause): void {}

export function handleProposal(event: Proposal): void {}

export function handleUnpause(event: Unpause): void {}

export function handleUnvote(event: Unvote): void {}

export function handleVote(event: Vote): void {}

export function handleIncentivization1(event: Incentivization1): void {}

export function handleSeasonOfPlenty(event: SeasonOfPlenty): void {
  let snapshot = getSeason(event.params.season)
  let newHarvestable = convertIntegerToDecimal(event.params.harvestable, BI_6)
  snapshot.newHarvestablePods = snapshot.newHarvestablePods.plus(newHarvestable)
  snapshot.harvestableBeans = snapshot.harvestableBeans.plus(newHarvestable)
  snapshot.pods = snapshot.pods.minus(newHarvestable)

  let eth = convertIntegerToDecimal(event.params.eth, BI_18)
  snapshot.newSopEth = eth
  snapshot.cumulativeSopEth = snapshot.cumulativeSopEth.plus(eth)
  snapshot.sopEth = snapshot.sopEth.plus(eth)
  snapshot.save()
}

export function handleSunrise(event: Sunrise): void {}

export function handleSupplyDecrease(event: SupplyDecrease): void {
  let newSoil = convertIntegerToDecimal(event.params.newSoil, BI_6)
  
  let snapshot = getSeason(event.params.season)
  snapshot.newSoil = newSoil
  snapshot.soil = snapshot.soil.plus(newSoil)
  snapshot = setAverageHistoricalBeans(snapshot)
  snapshot.save()
}

export function handleSupplyIncrease(event: SupplyIncrease): void {
  let snapshot = getSeason(event.params.season)
  let newHarvestable = convertIntegerToDecimal(event.params.newHarvestable, BI_6)
  let newFarmable = convertIntegerToDecimal(event.params.newSilo, BI_6)
  let newSoil = convertIntegerToDecimal(event.params.newSoil, BI_6)

  snapshot.depositedBeans = snapshot.depositedBeans.plus(newFarmable)
  snapshot.newFarmableBeans = newFarmable
  snapshot.newSoil = newSoil
  snapshot.soil = snapshot.soil.plus(newSoil)
  snapshot.pods = snapshot.pods.minus(newHarvestable)
  snapshot.harvestableBeans = snapshot.harvestableBeans.plus(newHarvestable)
  snapshot.harvestedPods = snapshot.harvestedPods.plus(newHarvestable)
  snapshot.newHarvestablePods = snapshot.newHarvestablePods.plus(newHarvestable)
  let beanPair = getBeanPair()
  snapshot.cumulativeFarmableBeansPerLP = snapshot.cumulativeFarmableBeansPerLP.plus(newFarmable.div(beanPair.supply))
  snapshot.cumulativeHarvestableBeansPerLP = snapshot.cumulativeHarvestableBeansPerLP.plus(newHarvestable.div(beanPair.supply))
  snapshot = setAverageHistoricalBeans(snapshot)
  snapshot.save()
}

export function handleSupplyNeutral(event: SupplyNeutral): void {
  let snapshot = getSeason(event.params.season)
  snapshot = setAverageHistoricalBeans(snapshot)
  snapshot.save()
}

export function handleWeatherChange(event: WeatherChange): void {}


export function handleTransfer(event: Transfer): void {
  if (event.address.toHexString() == BEAN_ADDRESS.toHexString()) handleBeanTransfer(event)
  else if (event.address.toHexString() == BEAN_PAIR_ADDRESS.toHexString()) handleLPTransfer(event)
}

function handleBeanTransfer(event: Transfer) : void {

  // Bean flow to Beanstalk
  let beans = convertIntegerToDecimal(event.params.value, BI_6)
  if (event.params.from.toHexString() == BEANSTALK_ADDRESS.toHexString()) {
    let txn = getTransaction(event.transaction.hash)
    txn.beansFromBeanstalk = txn.beansFromBeanstalk.plus(beans)
    txn.save()
  } else if (event.params.to.toHexString() == BEANSTALK_ADDRESS.toHexString()) {
    let txn = getTransaction(event.transaction.hash)
    txn.beansToBeanstalk = txn.beansToBeanstalk.plus(beans)
    txn.save()
  }

  let fromAccount = getAccount(event.params.from)
  fromAccount.beans = fromAccount.beans.minus(beans)
  fromAccount.save()

  let toAccount = getAccount(event.params.to)
  toAccount.beans = toAccount.beans.plus(beans)
  toAccount.save()

  // Bean flow to/from budgets
  if (event.params.from.toHexString() == DEVELOPMENT_BUDGET_ADDRESS.toHexString() ||
      event.params.from.toHexString() == MARKETING_BUDGET_ADDRESS.toHexString()) {
    let season = getCurrentSeason()
    season.budgetBeans = season.budgetBeans.minus(beans)
    season.save()
  } else if (event.params.to.toHexString() == DEVELOPMENT_BUDGET_ADDRESS.toHexString() ||
             event.params.to.toHexString() == MARKETING_BUDGET_ADDRESS.toHexString()) {
    let season = getCurrentSeason()
    season.budgetBeans = season.budgetBeans.plus(beans)
    season.save()
  }

  // Bean flow to/from budgets
  if (event.params.from.toHexString() == ADDRESS_ZERO.toHexString()) {
    let season = getCurrentSeason()
    season.beans = season.beans.plus(convertIntegerToDecimal(event.params.value, BI_6))
    season.save()
  } else if (event.params.to.toHexString() == ADDRESS_ZERO.toHexString()) {
    let season = getCurrentSeason()
    season.beans = season.beans.minus(convertIntegerToDecimal(event.params.value, BI_6))
    season.save()
  }
}

function handleLPTransfer(event: Transfer) : void {
  if (event.params.from.toHexString() == ADDRESS_ZERO.toHexString()) {
    let pair = getPair(BEAN_PAIR_ADDRESS)
    let season = getCurrentSeason()
    let lp = convertIntegerToDecimal(event.params.value, BI_18)
    pair.supply = pair.supply.plus(lp)
    season.lp = season.lp.plus(lp)
    season.save()
    pair.save()
  } else if (event.params.to.toHexString() == ADDRESS_ZERO.toHexString()) {
    let pair = getPair(BEAN_PAIR_ADDRESS)
    let season = getCurrentSeason()
    let lp = convertIntegerToDecimal(event.params.value, BI_18)
    pair.supply = pair.supply.minus(lp)
    season.lp = season.lp.minus(lp)
    season.save()
    pair.save()
  }
}

function getBeanPrice(): BigDecimal {
  let beanPair = getBeanPair()
  let usdcPair = UniswapV2Pair.bind(USDC_PAIR_ADDRESS)
  let reserves = usdcPair.getReserves()
  let usdcReserve0 = convertIntegerToDecimal(reserves.value0, BI_6)
  let usdcReserve1 = convertIntegerToDecimal(reserves.value1, BI_18)
  return beanPair.reserve0.div(beanPair.reserve1).times(usdcReserve0).div(usdcReserve1)
}

function getEthPrice(): BigDecimal {
  let usdcPair = UniswapV2Pair.bind(USDC_PAIR_ADDRESS)
  let reserves = usdcPair.getReserves()
  let usdcReserve0 = convertIntegerToDecimal(reserves.value0, BI_6)
  let usdcReserve1 = convertIntegerToDecimal(reserves.value1, BI_18)
  return usdcReserve0.div(usdcReserve1)
}

function getBeanPair() : Pair {
  return getPair(BEAN_PAIR_ADDRESS)
}

function getPair(address: Address): Pair {
  let pair = Pair.load(address.toHex())
  if (pair != null) return pair as Pair
  pair = new Pair(address.toHex())
  pair.supply = ZERO_BD
  pair.reserve0 = ZERO_BD
  pair.reserve1 = ZERO_BD
  if (address.toHexString() == BEAN_PAIR_ADDRESS.toHexString()) {
    pair.decimals0 = BI_18
    pair.decimals1 = BI_6
  } else {
    pair.decimals1 = BI_18
    pair.decimals0 = BI_6
  }
  return pair as Pair
}