import { world, BlockLocation, ItemStack } from "@minecraft/server";

function addTaxes(coords, amount) {
  const dimension = world.getDimension("overworld");
  const chest = dimension.getBlock(coords);
  
    if (chest && chest.typeId === "minecraft:chest") 
    {
            const inventoryComponent = block.getComponent("inventory");
            const container = inventoryComponent.container;
            if (container) {
                const itemStack = new ItemStack("minecraft:emerald", amount);

                container.addItem(diamantStack);
            
                console.info("Steuern erfolgreich ausgezahlt");
            }
    } 
    else 
    {
        console.error("An den Koordinaten wurde keine Truhe gefunden.");
    }
}