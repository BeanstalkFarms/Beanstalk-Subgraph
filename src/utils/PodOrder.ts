import { Bytes } from "@graphprotocol/graph-ts";
import { PodOrder } from "../../generated/schema";
import { ZERO_BI } from "./Decimals";

export function loadPodOrder(orderID: Bytes): PodOrder {
    let order = PodOrder.load(orderID.toHexString())
    if (order == null) {
        order = new PodOrder(orderID.toHexString())
        order.historyID = ''
        order.farmer = ''
        order.createdAt = ZERO_BI
        order.updatedAt = ZERO_BI
        order.status = ''
        order.amount = ZERO_BI
        order.filledAmount = ZERO_BI
        order.maxPlaceInLine = ZERO_BI
        order.pricePerPod = 0
        order.save()
    }
    return order
}

export function createHistoricalPodOrder(order: PodOrder): void {
    let created = false
    let id = order.id
    for (let i = 0; !created; i++) {
        id = order.id + '-' + i.toString()
        let newOrder = PodOrder.load(id)
        if (newOrder == null) {
            newOrder = new PodOrder(id)
            newOrder.historyID = order.historyID
            newOrder.farmer = order.farmer
            newOrder.createdAt = order.createdAt
            newOrder.updatedAt = order.updatedAt
            newOrder.status = order.status
            newOrder.amount = order.amount
            newOrder.filledAmount = order.filledAmount
            newOrder.maxPlaceInLine = order.maxPlaceInLine
            newOrder.pricePerPod = order.pricePerPod
            newOrder.save()
            created = true
        }
    }
}
