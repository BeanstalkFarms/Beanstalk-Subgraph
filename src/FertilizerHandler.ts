import { Address, BigInt, log } from "@graphprotocol/graph-ts";
import { TransferSingle, TransferBatch } from "../generated/Fertilizer/Fertilizer"
import { ADDRESS_ZERO, FERTILIZER } from "./utils/Constants";
import { loadFertilizer, loadFertilizerBalance, loadFertilizerToken } from "./utils/Fertilizer";
import { loadFarmer } from "./utils/Farmer";

export function handleTransferSingle(event: TransferSingle): void {
    handleTransfer(event.params.from, event.params.to, event.params.id, event.params.value)
}

export function handleTransferBatch(event: TransferBatch): void {
    for (let i = 0; i < event.params.ids.length; i++) {
        let id = event.params.ids[i]
        let amount = event.params.values[i]
        handleTransfer(event.params.from, event.params.to, id, amount)
    }
}

function handleTransfer(from: Address, to: Address, id: BigInt, amount: BigInt): void {
    let fertilizer = loadFertilizer(FERTILIZER)
    let fertilizerToken = loadFertilizerToken(fertilizer, id)
    log.debug('\nFert Transfer: id – {}\n', [id.toString()])
    if (from != ADDRESS_ZERO) {
        let fromFarmer = loadFarmer(from)
        let fromFertilizerBalance = loadFertilizerBalance(fertilizerToken, fromFarmer)
        fromFertilizerBalance.save()
    } else {
        fertilizerToken.supply = fertilizerToken.supply.plus(amount)
        fertilizer.totalSupply = fertilizer.totalSupply.plus(amount)
        fertilizer.save()
        fertilizerToken.save()
    }

    let toFarmer = loadFarmer(to)
    let toFertilizerBalance = loadFertilizerBalance(fertilizerToken, toFarmer)
    toFertilizerBalance.amount = toFertilizerBalance.amount.plus(amount)
    toFertilizerBalance.save()

}