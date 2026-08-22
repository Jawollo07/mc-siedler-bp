import { world, system, EquipmentSlot } from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// Hàm hiển thị modal form
function showInteractionForm(player, target) {
    // Kiểm tra tính hợp lệ
    if (!player || !player.isValid || !target || !target.isValid) return;

    // Lấy giá trị thô từ Property
    const rawStay = target.getProperty("fv:stay_mode");
    const rawKill = target.getProperty("fv:kill_player_mode");

    // Ép kiểu boolean an toàn
    const stayMode = (typeof rawStay === 'boolean') ? rawStay : false;
    const killPlayerMode = (typeof rawKill === 'boolean') ? rawKill : false;

    // Tạo Form
    const modalForm = new ModalFormData()
        .title({ translate: 'title.interaction.soldier' })

        // SỬA LỖI UI v2: Tham số thứ 2 phải là Object chứa defaultValue
        .toggle({ translate: 'buttom.stay.name' }, { defaultValue: stayMode })
        .toggle({ translate: 'buttom.kill_player_mode.name' }, { defaultValue: killPlayerMode });

    // Hiển thị Form
    modalForm.show(player).then((formData) => {
        if (formData.canceled) {
            return;
        }

        const [stayModeSelected, killPlayerModeSelected] = formData.formValues;

        // Kiểm tra target còn tồn tại không trước khi setProperty
        if (target.isValid) {
            try {
                // Cập nhật lại property
                target.setProperty("fv:stay_mode", stayModeSelected);
                target.setProperty("fv:kill_player_mode", killPlayerModeSelected);

                // (Tùy chọn) Thông báo thành công
                // player.sendMessage({ translate: 'message.settings_saved' });
            } catch (e) {
                console.warn("Lỗi setProperty. Hãy kiểm tra file JSON của entity đã khai báo property chưa.");
            }
        }
    }).catch((error) => {
        // Ignored (Lỗi khi player đóng form hoặc mất kết nối)
    });
}

// Đăng ký sự kiện playerInteractWithEntity
world.afterEvents.playerInteractWithEntity.subscribe((event) => {
    const player = event.player;
    const target = event.target;

    // Kiểm tra tính hợp lệ cơ bản
    if (!player || !player.isValid || !target || !target.isValid) return;

    try {
        const equippable = player.getComponent("minecraft:equippable");
        if (!equippable) return;

        const mainHandItem = equippable.getEquipment(EquipmentSlot.Mainhand);

        // Kiểm tra item kích hoạt
        if (mainHandItem && mainHandItem.typeId === 'fv:command_flag') {

            // Đẩy vào system.run để đảm bảo UI hiện lên ở tick tiếp theo
            system.run(() => {
                // Kiểm tra isValid lần nữa vì sau 1 tick mọi thứ có thể thay đổi
                if (player.isValid && target.isValid) {
                    showInteractionForm(player, target);
                }
            });
        }
    } catch (error) {
        // Ignored
    }
});