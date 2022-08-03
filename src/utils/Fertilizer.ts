import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Farmer, Fertilizer, FertilizerBalance, FertilizerToken } from "../../generated/schema"
import { ZERO_BI } from "./Decimals"
import { INITIAL_HUMIDITY } from "./Constants"

export function loadFertilizer(fertilizerAddress: Address): Fertilizer {
    let fertilizer = Fertilizer.load(fertilizerAddress.toHexString())
    if (fertilizer == null) {
        fertilizer = new Fertilizer(fertilizerAddress.toHexString())
        fertilizer.humidity = INITIAL_HUMIDITY
        fertilizer.season = 6074
        fertilizer.bpf = ZERO_BI
        fertilizer.totalSupply = ZERO_BI
        fertilizer.save()
    }
    return fertilizer
}

export function loadFertilizerToken(fertilizer: Fertilizer, id: BigInt): FertilizerToken {
    let fertilizerToken = FertilizerToken.load(id.toString())
    if (fertilizerToken == null) {
        fertilizerToken = new FertilizerToken(id.toString())
        fertilizerToken.fertilizer = fertilizer.id
        fertilizerToken.humidity = fertilizer.humidity
        fertilizerToken.season = fertilizer.season
        fertilizerToken.startBpf = fertilizer.bpf
        fertilizerToken.endBpf = id
        fertilizerToken.supply = ZERO_BI
        fertilizerToken.save()
    }
    return fertilizerToken
}

export function loadFertilizerBalance(fertilizerToken: FertilizerToken, farmer: Farmer): FertilizerBalance {
    const id = `${fertilizerToken.id}-${farmer.id}`
    let fertilizerBalance = FertilizerBalance.load(id)
    if (fertilizerBalance == null) {
        fertilizerBalance = new FertilizerBalance(id)
        fertilizerBalance.farmer = farmer.id
        fertilizerBalance.fertilizerToken = fertilizerToken.id
        fertilizerBalance.amount = ZERO_BI
        fertilizerBalance.save()
    }
    return fertilizerBalance
}