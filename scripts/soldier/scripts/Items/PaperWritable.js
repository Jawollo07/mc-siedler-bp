import { world, Player, ItemStack, ItemCustomComponentAlreadyRegisteredError, EquipmentSlot, system } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';

// SỬA LỖI API: Thay thế world.beforeEvents.worldInitialize bằng system.beforeEvents.startup
// Đăng ký custom component fv:paper_writable
system.beforeEvents.startup.subscribe((initEvent) => {
    try {
        initEvent.itemComponentRegistry.registerCustomComponent("fv:paper_writable", {
            onUse(event) {
                const { itemStack, source } = event;
                if (itemStack.typeId === 'fv:paper_writable') {
                    openWritablePaperUI(source);
                }
            }
        });
    } catch (error) {
        if (error instanceof ItemCustomComponentAlreadyRegisteredError) {
            console.warn("Custom component fv:paper_writable đã đăng ký trước.");
        } else {
            console.error("Lỗi khi đăng ký custom component:", error);
        }
    }
});

// Hàm mở form giấy quyền lực
function openWritablePaperUI(player) {
    const form = new ActionFormData()
        .title({ translate: 'title.writable.name' })
        .body({ translate: 'mess.description.translate' })
        .button({ translate: 'buttom.freehand_decree.name' })
        .button({ translate: 'buttom.discharge_letter.name' });

    form.show(player).then((response) => {
        if (response.canceled) return;

        if (response.selection === 0) {
            // Freehand Decree
            if (removeItem(player, 'fv:paper_writable', 1)) {
                addItemToPlayer(player, 'fv:freehand_decree', 1);
                player.sendMessage({ translate: 'message.created_freehand_decree' });
            }
        } else if (response.selection === 1) {
            // Discharge Letter
            if (removeItem(player, 'fv:paper_writable', 1)) {
                addItemToPlayer(player, 'fv:discharge_letter', 1);
                player.sendMessage({ translate: 'message.created_discharge_letter' });
            }
        }
    });
}

// Trừ item trên tay mainhand, kiểm tra an toàn
function removeItem(player, itemType, amount) {
    const equippable = player.getComponent("minecraft:equippable");
    const mainHandItem = equippable.getEquipment(EquipmentSlot.Mainhand);

    if (!mainHandItem || mainHandItem.typeId !== itemType) {
        console.warn('Item không đúng trong mainhand!');
        return false;
    }

    if (mainHandItem.amount > amount) {
        mainHandItem.amount -= amount;
        equippable.setEquipment(EquipmentSlot.Mainhand, mainHandItem);
        return true;
    } else if (mainHandItem.amount === amount) {
        equippable.setEquipment(EquipmentSlot.Mainhand); // clear slot
        return true;
    } else {
        console.warn('Không đủ số lượng item trong mainhand!');
        return false;
    }
}

// Thêm item vào inventory
function addItemToPlayer(player, itemType, amount) {
    const inventory = player.getComponent("minecraft:inventory");
    const newItem = new ItemStack(itemType, amount);
    inventory.container.addItem(newItem);
}