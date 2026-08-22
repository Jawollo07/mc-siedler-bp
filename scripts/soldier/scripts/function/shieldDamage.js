export function damageItem(item) {
    const durabilityComponent = item.getComponent("durability")
    let actualDurability = durabilityComponent.maxDurability - durabilityComponent.damage
    if (!durabilityComponent) return item
    if (durabilityComponent.damage == durabilityComponent.maxDurability || actualDurability == 1) return
    durabilityComponent.damage += 1
    return item
}